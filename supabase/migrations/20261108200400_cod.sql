-- F07: otkupi i uplate.
-- Faze: awaiting_collection (Čeka naplatu) → collected_by_courier (Naplaćeno, kod kurira)
--       → paid_by_courier (Kurir uplatio) → paid_out (Isplaćeno klijentu).
-- Otkup se nikad ne isplaćuje delimično: jedna pošiljka = najviše jedna uplata kurira.

create type public.cod_phase as enum (
  'awaiting_collection', 'collected_by_courier', 'paid_by_courier', 'paid_out'
);

-- ---------------------------------------------------------------------------
-- Uplate kurira (jedan red po stavci iz BEX specifikacije)
-- ---------------------------------------------------------------------------
create table public.cod_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  courier_code text not null check (courier_code ~ '^[a-z][a-z0-9_]{1,30}$'),
  tracking_number text not null check (tracking_number ~ '^\S{4,40}$'),
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'RSD',
  -- "D. naplate" iz specifikacije
  paid_on date not null,
  -- "D. preuzimanja" iz specifikacije
  picked_up_on date,
  -- "Napomena klijenta" (oznaka klijenta fulfillment centra)
  client_ref text,
  import_id uuid references public.imports (id) on delete set null,
  shipment_id uuid,
  match_error text,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (shipment_id, tenant_id) references public.shipments (id, tenant_id) on delete set null (shipment_id),
  -- isti izveštaj uvezen dva puta ne duplira uplate
  unique (tenant_id, courier_code, tracking_number),
  unique (id, tenant_id)
);

create index cod_payments_unmatched_idx on public.cod_payments (tenant_id) where shipment_id is null;
create index cod_payments_paid_on_idx on public.cod_payments (tenant_id, paid_on desc);

-- ---------------------------------------------------------------------------
-- Isplate klijentu (specifikacija)
-- ---------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  total numeric(14, 2) not null check (total >= 0),
  item_count integer not null check (item_count > 0),
  currency char(3) not null default 'RSD',
  client_ref text,
  note text,
  -- PDF/Excel specifikacija u Storage-u (pravi se u F07 posle isplate)
  file_path text,
  created_at timestamptz not null default now(),
  unique (id, tenant_id)
);

create index payouts_tenant_created_idx on public.payouts (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Otkup po pošiljci
-- ---------------------------------------------------------------------------
create table public.cod_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  shipment_id uuid not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'RSD',
  phase public.cod_phase not null default 'awaiting_collection',
  collected_at timestamptz,
  courier_paid_on date,
  cod_payment_id uuid,
  payout_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shipment_id, tenant_id) references public.shipments (id, tenant_id) on delete cascade,
  foreign key (cod_payment_id, tenant_id) references public.cod_payments (id, tenant_id) on delete set null (cod_payment_id),
  foreign key (payout_id, tenant_id) references public.payouts (id, tenant_id),
  check (phase <> 'paid_out' or payout_id is not null),
  check (phase not in ('paid_by_courier', 'paid_out') or cod_payment_id is not null or payout_id is not null)
);

create index cod_items_tenant_phase_idx on public.cod_items (tenant_id, phase);

create trigger cod_items_updated_at
  before update on public.cod_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Faza se menja sama sa statusom pošiljke (dok kurir nije uplatio)
-- ---------------------------------------------------------------------------
create function private.sync_cod_item() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_phase public.cod_phase :=
    case when new.status = 'delivered' then 'collected_by_courier'::public.cod_phase
         else 'awaiting_collection'::public.cod_phase end;
begin
  if new.cod_amount <= 0 then
    delete from public.cod_items c
    where c.shipment_id = new.id
      and c.phase in ('awaiting_collection', 'collected_by_courier');
    return new;
  end if;

  insert into public.cod_items (tenant_id, shipment_id, amount, currency, phase, collected_at)
  values (new.tenant_id, new.id, new.cod_amount, new.currency, v_phase,
          case when v_phase = 'collected_by_courier' then coalesce(new.last_status_at, now()) end)
  on conflict (shipment_id) do update
  set amount = excluded.amount,
      currency = excluded.currency,
      phase = excluded.phase,
      collected_at = excluded.collected_at
  -- uplaćen ili isplaćen otkup se više ne vraća unazad
  where public.cod_items.phase in ('awaiting_collection', 'collected_by_courier');

  return new;
end;
$$;

revoke all on function private.sync_cod_item() from public;

create trigger shipments_sync_cod_item
  after insert or update of status, cod_amount, currency, last_status_at on public.shipments
  for each row execute function private.sync_cod_item();

-- ---------------------------------------------------------------------------
-- Sparivanje uplata (worker posle uvoza izveštaja; idempotentno)
-- Nesparene uplate se pokušavaju ponovo, jer pošiljka može da stigne kasnije.
-- ---------------------------------------------------------------------------
create function public.match_cod_payments(p_tenant_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_matched integer;
  v_unmatched integer;
begin
  -- 1. poveži uplate sa pošiljkama po broju pošiljke
  update public.cod_payments p
  set shipment_id = s.id,
      matched_at = now(),
      match_error = case
        when s.cod_amount <> p.amount
          then 'Iznos se razlikuje: u konzoli ' || s.cod_amount::text || ', kurir uplatio ' || p.amount::text
        end
  from public.shipments s
  where p.tenant_id = p_tenant_id
    and p.shipment_id is null
    and s.tenant_id = p.tenant_id
    and s.courier_code = p.courier_code
    and s.tracking_number = p.tracking_number;

  update public.cod_payments p
  set match_error = 'Pošiljka nije u konzoli'
  where p.tenant_id = p_tenant_id and p.shipment_id is null;

  -- 2. otkup prelazi u "Kurir uplatio"
  update public.cod_items c
  set phase = 'paid_by_courier',
      cod_payment_id = p.id,
      courier_paid_on = p.paid_on
  from public.cod_payments p
  where p.tenant_id = p_tenant_id
    and c.tenant_id = p.tenant_id
    and c.shipment_id = p.shipment_id
    and c.phase in ('awaiting_collection', 'collected_by_courier');

  select count(*) filter (where shipment_id is not null), count(*) filter (where shipment_id is null)
  into v_matched, v_unmatched
  from public.cod_payments
  where tenant_id = p_tenant_id;

  return jsonb_build_object('matched', v_matched, 'unmatched', v_unmatched);
end;
$$;

revoke all on function public.match_cod_payments(uuid) from public, anon, authenticated;
grant execute on function public.match_cod_payments(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Isplata: samo admin sa MFA (aal2); svaka isplata u audit logu
-- ---------------------------------------------------------------------------
create function public.create_payout(p_tenant_id uuid, p_cod_item_ids uuid[], p_note text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_ids uuid[] := array(select distinct unnest(p_cod_item_ids));
  v_count integer;
  v_total numeric(14, 2);
  v_clients text[];
  v_payout uuid;
begin
  if not private.is_tenant_admin(p_tenant_id) then
    raise exception 'Samo administrator firme može da označi isplatu' using errcode = '42501';
  end if;

  if coalesce((select auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'Isplata traži dvostepenu prijavu (MFA)' using errcode = '42501';
  end if;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Nije izabran nijedan otkup' using errcode = '22023';
  end if;

  -- Zaključaj stavke i proveri da su sve iz ove firme i spremne za isplatu.
  -- Klijentu se isplaćuje ono što je kurir stvarno uplatio (iznos iz specifikacije).
  select count(*), sum(x.amount)
  into v_count, v_total
  from (
    select p.amount
    from public.cod_items c
    join public.cod_payments p on p.id = c.cod_payment_id
    where c.id = any (v_ids)
      and c.tenant_id = p_tenant_id
      and c.phase = 'paid_by_courier'
      and c.payout_id is null
    for update of c
  ) x;

  if v_count <> array_length(v_ids, 1) then
    raise exception 'Neki od izabranih otkupa nisu spremni za isplatu' using errcode = '22023';
  end if;

  select array_agg(distinct s.client_ref) into v_clients
  from public.cod_items c
  join public.shipments s on s.id = c.shipment_id
  where c.id = any (v_ids);

  insert into public.payouts (tenant_id, created_by, total, item_count, client_ref, note)
  values (p_tenant_id, (select auth.uid()), v_total, v_count,
          case when array_length(v_clients, 1) = 1 then v_clients[1] end, p_note)
  returning id into v_payout;

  update public.cod_items c
  set phase = 'paid_out', payout_id = v_payout
  where c.id = any (v_ids);

  perform private.audit(p_tenant_id, 'payout.created', 'payout', v_payout::text,
    jsonb_build_object('total', v_total, 'item_count', v_count, 'cod_item_ids', to_jsonb(v_ids)));

  return v_payout;
end;
$$;

revoke all on function public.create_payout(uuid, uuid[], text) from public, anon;
grant execute on function public.create_payout(uuid, uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: web sve ovo samo čita; menja se kroz worker i create_payout
-- ---------------------------------------------------------------------------
alter table public.cod_payments enable row level security;
alter table public.payouts enable row level security;
alter table public.cod_items enable row level security;

revoke all on public.cod_payments, public.payouts, public.cod_items from anon;
revoke insert, update, delete on public.cod_payments, public.payouts, public.cod_items from authenticated;

create policy cod_payments_select on public.cod_payments
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

create policy payouts_select on public.payouts
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

create policy cod_items_select on public.cod_items
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

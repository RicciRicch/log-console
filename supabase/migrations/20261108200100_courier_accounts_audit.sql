-- F01: kurirski nalozi firme, API ključ u Supabase Vault-u (ADR-008) i audit log.
-- Web nikad ne vidi ceo ključ: upisuje ga kroz set_courier_secret, a prikazuje secret_last4.
-- Dešifrovan ključ čita samo worker (service_role) kroz get_courier_secret.

-- ---------------------------------------------------------------------------
-- Audit log (append-only): sve što dira novac, ključeve i korisnike
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_created_idx on public.audit_log (tenant_id, created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon;
revoke insert, update, delete on public.audit_log from authenticated;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select private.is_tenant_admin(tenant_id)));

-- Upis u audit log iz drugih funkcija (nikad tajne u `data`)
create function private.audit(
  p_tenant_id uuid, p_action text, p_entity text, p_entity_id text, p_data jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, data)
  values (p_tenant_id, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_data, '{}'::jsonb))
$$;

revoke all on function private.audit(uuid, text, text, text, jsonb) from public;

-- Promene uloga i aktivnosti članova idu u audit log
create function private.audit_membership_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(new.tenant_id, 'membership.created', 'membership', new.user_id::text,
      jsonb_build_object('role', new.role));
  elsif tg_op = 'UPDATE' and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    perform private.audit(new.tenant_id, 'membership.updated', 'membership', new.user_id::text,
      jsonb_build_object('role', jsonb_build_array(old.role, new.role),
                         'is_active', jsonb_build_array(old.is_active, new.is_active)));
  elsif tg_op = 'DELETE' and exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    perform private.audit(old.tenant_id, 'membership.deleted', 'membership', old.user_id::text, '{}'::jsonb);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_membership_change() from public;

create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function private.audit_membership_change();

-- ---------------------------------------------------------------------------
-- Kurirski nalozi
-- ---------------------------------------------------------------------------
create table public.courier_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  courier_code text not null check (courier_code ~ '^[a-z][a-z0-9_]{1,30}$'),
  vault_secret_id uuid,
  secret_last4 text check (secret_last4 is null or length(secret_last4) <= 4),
  client_id text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, courier_code)
);

create unique index courier_accounts_one_default
  on public.courier_accounts (tenant_id)
  where is_default;

create trigger courier_accounts_updated_at
  before update on public.courier_accounts
  for each row execute function private.set_updated_at();

alter table public.courier_accounts enable row level security;
revoke all on public.courier_accounts from anon;

-- Član vidi naloge svoje firme (bez ključa: ključ nije u ovoj tabeli)
create policy courier_accounts_select on public.courier_accounts
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

-- Admin menja samo nelične, netajne kolone; ključ samo kroz set_courier_secret
create policy courier_accounts_update on public.courier_accounts
  for update to authenticated
  using ((select private.is_tenant_admin(tenant_id)))
  with check ((select private.is_tenant_admin(tenant_id)));

revoke insert, update, delete on public.courier_accounts from authenticated;
grant update (client_id, is_default) on public.courier_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Unos i zamena ključa (ADR-008). Poziva se iz Server Action-a sa sesijom korisnika.
-- ---------------------------------------------------------------------------
create function public.set_courier_secret(p_tenant_id uuid, p_courier_code text, p_secret text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_secret text := btrim(coalesce(p_secret, ''));
  v_code text := lower(btrim(coalesce(p_courier_code, '')));
  v_account public.courier_accounts%rowtype;
  v_vault_id uuid;
  v_last4 text;
  v_first boolean;
  v_replaced boolean;
begin
  if not private.is_tenant_admin(p_tenant_id) then
    raise exception 'Samo administrator firme može da unese API ključ' using errcode = '42501';
  end if;

  if v_code !~ '^[a-z][a-z0-9_]{1,30}$' then
    raise exception 'Nepoznata oznaka kurira' using errcode = '22023';
  end if;

  if length(v_secret) < 8 then
    raise exception 'API ključ je prekratak' using errcode = '22023';
  end if;

  v_last4 := right(v_secret, 4);

  select * into v_account
  from public.courier_accounts a
  where a.tenant_id = p_tenant_id and a.courier_code = v_code
  for update;

  v_replaced := found and v_account.vault_secret_id is not null;

  if v_replaced then
    perform vault.update_secret(v_account.vault_secret_id, v_secret);
    v_vault_id := v_account.vault_secret_id;
  else
    v_vault_id := vault.create_secret(
      v_secret,
      'courier:' || p_tenant_id::text || ':' || v_code || ':' || gen_random_uuid()::text,
      'API ključ kurira ' || v_code
    );
  end if;

  v_first := not exists (select 1 from public.courier_accounts a where a.tenant_id = p_tenant_id);

  insert into public.courier_accounts (tenant_id, courier_code, vault_secret_id, secret_last4, is_default)
  values (p_tenant_id, v_code, v_vault_id, v_last4, v_first)
  on conflict (tenant_id, courier_code)
    do update set vault_secret_id = excluded.vault_secret_id, secret_last4 = excluded.secret_last4;

  -- U audit log nikad ne ide ključ, ni deo ključa
  perform private.audit(p_tenant_id,
    case when v_replaced then 'courier_secret.replaced' else 'courier_secret.created' end,
    'courier_account', v_code, '{}'::jsonb);

  return v_last4;
end;
$$;

revoke all on function public.set_courier_secret(uuid, text, text) from public, anon;
grant execute on function public.set_courier_secret(uuid, text, text) to authenticated;

-- Čitanje dešifrovanog ključa: samo worker (service_role). Ne postoji put do weba.
create function public.get_courier_secret(p_tenant_id uuid, p_courier_code text)
returns text
language sql stable security definer set search_path = ''
as $$
  select s.decrypted_secret
  from public.courier_accounts a
  join vault.decrypted_secrets s on s.id = a.vault_secret_id
  where a.tenant_id = p_tenant_id and a.courier_code = lower(p_courier_code)
$$;

revoke all on function public.get_courier_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.get_courier_secret(uuid, text) to service_role;

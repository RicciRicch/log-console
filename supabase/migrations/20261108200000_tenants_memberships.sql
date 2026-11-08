-- F01: firme, podešavanja, članstva i pozivi.
-- Pravilo: svaka tabela sa podacima firme ima tenant_id i RLS (CLAUDE.md, pravilo 1).
-- Web radi kao `authenticated` kroz RLS; worker radi kao `service_role` (zaobilazi RLS).

-- Pomoćne funkcije za RLS žive u šemi `private`, koja nije izložena kroz API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create extension if not exists pg_trgm with schema extensions;

create type public.member_role as enum ('admin', 'operator');

-- updated_at se postavlja sam
create function private.set_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Firme
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  stuck_after_days integer not null default 3 check (stuck_after_days between 1 and 60),
  timezone text not null default 'Europe/Belgrade',
  updated_at timestamptz not null default now()
);

create trigger tenant_settings_updated_at
  before update on public.tenant_settings
  for each row execute function private.set_updated_at();

-- Svaka nova firma dobija podrazumevana podešavanja
create function private.create_tenant_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.tenant_settings (tenant_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger tenants_create_settings
  after insert on public.tenants
  for each row execute function private.create_tenant_settings();

-- ---------------------------------------------------------------------------
-- Članstva (korisnik može da bude u više firmi)
-- ---------------------------------------------------------------------------
create table public.memberships (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'operator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Pozivi: admin upisuje email i ulogu, korisnik posle prijave poziva
-- accept_invitations(). Web zato ne treba service_role ključ.
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  role public.member_role not null default 'operator',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

create unique index invitations_open_per_email
  on public.invitations (tenant_id, email)
  where accepted_at is null;

-- ---------------------------------------------------------------------------
-- Helperi za RLS
-- ---------------------------------------------------------------------------

-- Aktivne firme trenutnog korisnika
create function private.auth_tenant_ids() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.tenant_id
  from public.memberships m
  join public.tenants t on t.id = m.tenant_id
  where m.user_id = (select auth.uid())
    and m.is_active
    and t.is_active
$$;

-- Da li je trenutni korisnik aktivan admin date firme
create function private.is_tenant_admin(p_tenant_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.is_active
      and t.is_active
      and m.role = 'admin'
  )
$$;

revoke all on function private.auth_tenant_ids() from public;
revoke all on function private.is_tenant_admin(uuid) from public;
grant execute on function private.auth_tenant_ids() to authenticated, service_role;
grant execute on function private.is_tenant_admin(uuid) to authenticated, service_role;

-- Firma ne sme da ostane bez aktivnog admina
create function private.protect_last_admin() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_remaining integer;
begin
  -- Brisanje cele firme (cascade) je dozvoljeno: tada firma više ne postoji.
  if not exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    return coalesce(new, old);
  end if;

  if old.role = 'admin' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.is_active) then
    select count(*) into v_remaining
    from public.memberships m
    where m.tenant_id = old.tenant_id
      and m.user_id <> old.user_id
      and m.role = 'admin'
      and m.is_active;
    if v_remaining = 0 then
      raise exception 'Firma mora da ima bar jednog aktivnog administratora'
        using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger memberships_protect_last_admin
  before update or delete on public.memberships
  for each row execute function private.protect_last_admin();

-- Članstvo ne može da se premesti u drugu firmu ni na drugog korisnika
create function private.memberships_immutable_keys() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.tenant_id <> old.tenant_id or new.user_id <> old.user_id then
    raise exception 'tenant_id i user_id se ne menjaju' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger memberships_immutable_keys
  before update on public.memberships
  for each row execute function private.memberships_immutable_keys();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

-- anon nema pristup ničemu
revoke all on public.tenants, public.tenant_settings, public.memberships, public.invitations from anon;

-- tenants: član čita svoju firmu; nove firme samo kroz create_tenant (service_role)
create policy tenants_select on public.tenants
  for select to authenticated
  using (id in (select private.auth_tenant_ids()));

-- tenant_settings: član čita, admin menja
create policy tenant_settings_select on public.tenant_settings
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

create policy tenant_settings_update on public.tenant_settings
  for update to authenticated
  using ((select private.is_tenant_admin(tenant_id)))
  with check ((select private.is_tenant_admin(tenant_id)));

-- memberships: član vidi kolege iz svoje firme; admin menja ulogu i aktivnost.
-- Nova članstva nastaju samo kroz accept_invitations i create_tenant.
create policy memberships_select on public.memberships
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

create policy memberships_update on public.memberships
  for update to authenticated
  using ((select private.is_tenant_admin(tenant_id)))
  with check ((select private.is_tenant_admin(tenant_id)));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using ((select private.is_tenant_admin(tenant_id)));

-- Kolone koje web sme da menja na članstvu
revoke update on public.memberships from authenticated;
grant update (role, is_active) on public.memberships to authenticated;
revoke insert on public.memberships from authenticated;

-- invitations: sve samo admin te firme
create policy invitations_select on public.invitations
  for select to authenticated
  using ((select private.is_tenant_admin(tenant_id)));

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    (select private.is_tenant_admin(tenant_id))
    and invited_by = (select auth.uid())
    and accepted_at is null
  );

create policy invitations_delete on public.invitations
  for delete to authenticated
  using ((select private.is_tenant_admin(tenant_id)) and accepted_at is null);

revoke update on public.invitations from authenticated;

-- tenant_settings: samo podešavanja se menjaju, ne tenant_id
revoke insert, delete on public.tenant_settings from authenticated;
revoke update on public.tenant_settings from authenticated;
grant update (stuck_after_days, timezone) on public.tenant_settings to authenticated;

revoke insert, update, delete on public.tenants from authenticated;

-- ---------------------------------------------------------------------------
-- RPC: prihvatanje poziva posle prijave
-- ---------------------------------------------------------------------------
create function public.accept_invitations() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_count integer;
begin
  -- Samo korisnik sa potvrđenim email-om (magic link ili potvrda) prima pozive
  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_user and u.email_confirmed_at is not null;

  if v_email is null then
    return 0;
  end if;

  with accepted as (
    update public.invitations i
    set accepted_at = now()
    where i.email = v_email
      and i.accepted_at is null
      and i.expires_at > now()
    returning i.tenant_id, i.role
  )
  insert into public.memberships (tenant_id, user_id, role)
  select a.tenant_id, v_user, a.role from accepted a
  -- Ponovni poziv aktivira deaktiviranog člana sa novom ulogom.
  -- Aktivnom članu se uloga ne menja kroz poziv (to radi admin u ekranu Korisnici).
  on conflict (tenant_id, user_id)
    do update set
      role = case when public.memberships.is_active then public.memberships.role else excluded.role end,
      is_active = true;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.accept_invitations() from public, anon;
grant execute on function public.accept_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- Vlasnik platforme otvara firmu (skripta ili SQL editor, samo service_role).
-- Prvi admin dobija poziv i postaje admin čim se prijavi.
-- ---------------------------------------------------------------------------
create function public.create_tenant(p_name text, p_admin_email text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  insert into public.tenants (name) values (btrim(p_name)) returning id into v_tenant;
  insert into public.invitations (tenant_id, email, role, expires_at)
  values (v_tenant, lower(btrim(p_admin_email)), 'admin', now() + interval '30 days');
  return v_tenant;
end;
$$;

revoke all on function public.create_tenant(text, text) from public, anon, authenticated;
grant execute on function public.create_tenant(text, text) to service_role;

-- Ostale funkcije nisu za API
revoke all on function private.set_updated_at() from public;
revoke all on function private.create_tenant_settings() from public;
revoke all on function private.protect_last_admin() from public;
revoke all on function private.memberships_immutable_keys() from public;

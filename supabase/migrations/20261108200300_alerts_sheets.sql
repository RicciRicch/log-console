-- F05: upozorenja. F08: veza sa Google Sheet-om.
-- "Nije preuzeto" nije u MVP-u: kurir nekad ne skenira paket, pa pratimo samo
-- statuse sa API-ja (docs/PILOT-PRIMERI.md). Nova vrsta se dodaje sa
-- `alter type public.alert_type add value ...` u novoj migraciji.

create type public.alert_type as enum ('failed_delivery', 'stuck');
create type public.alert_resolution as enum ('auto', 'manual');

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  shipment_id uuid not null,
  type public.alert_type not null,
  -- npr. { "attempts": 2, "reason": "Bio na adresi - Ne javlja se na telefon" }
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution public.alert_resolution,
  foreign key (shipment_id, tenant_id)
    references public.shipments (id, tenant_id) on delete cascade,
  check ((resolved_at is null) = (resolution is null))
);

-- Najviše jedno otvoreno upozorenje iste vrste po pošiljci (evaluate-alerts je idempotentan)
create unique index alerts_one_open
  on public.alerts (shipment_id, type)
  where resolved_at is null;
create index alerts_open_by_type_idx
  on public.alerts (tenant_id, type, opened_at desc)
  where resolved_at is null;

alter table public.alerts enable row level security;
revoke all on public.alerts from anon;

create policy alerts_select on public.alerts
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

-- Član ručno zatvara otvoreno upozorenje svoje firme ("Rešeno"); ponovo otvara samo worker
create policy alerts_resolve on public.alerts
  for update to authenticated
  using (tenant_id in (select private.auth_tenant_ids()) and resolved_at is null)
  with check (
    tenant_id in (select private.auth_tenant_ids())
    and resolved_at is not null
    and resolution = 'manual'
    and resolved_by = (select auth.uid())
  );

revoke insert, update, delete on public.alerts from authenticated;
grant update (resolved_at, resolved_by, resolution) on public.alerts to authenticated;

-- ---------------------------------------------------------------------------
-- Google Sheet veza (F08). OAuth tokeni, ako budu, idu u Vault kao kurirski ključevi.
-- ---------------------------------------------------------------------------
create table public.sheet_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  spreadsheet_id text not null check (spreadsheet_id ~ '^[A-Za-z0-9_-]{10,100}$'),
  sheet_name text not null,
  tracking_column text not null,
  status_column text not null,
  auth_type text not null default 'service_account' check (auth_type in ('service_account', 'oauth')),
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, spreadsheet_id, sheet_name)
);

create trigger sheet_connections_updated_at
  before update on public.sheet_connections
  for each row execute function private.set_updated_at();

alter table public.sheet_connections enable row level security;
revoke all on public.sheet_connections from anon;

create policy sheet_connections_select on public.sheet_connections
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));
create policy sheet_connections_insert on public.sheet_connections
  for insert to authenticated
  with check ((select private.is_tenant_admin(tenant_id)));
create policy sheet_connections_update on public.sheet_connections
  for update to authenticated
  using ((select private.is_tenant_admin(tenant_id)))
  with check ((select private.is_tenant_admin(tenant_id)));
create policy sheet_connections_delete on public.sheet_connections
  for delete to authenticated
  using ((select private.is_tenant_admin(tenant_id)));

revoke update on public.sheet_connections from authenticated;
grant update (sheet_name, tracking_column, status_column, is_active) on public.sheet_connections to authenticated;

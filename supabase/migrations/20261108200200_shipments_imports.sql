-- F02 + F04: uvozi, mape kolona, pošiljke i istorija statusa.
-- Pošiljke i događaje piše worker (service_role). Web ih samo čita.
-- Kolone prate stvarnu tabelu pilot firme (docs/PILOT-PRIMERI.md).

create type public.unified_status as enum (
  'created', 'in_transit', 'failed_delivery', 'delivered', 'returning', 'returned'
);
create type public.import_source as enum ('file', 'google_sheet');
create type public.import_kind as enum ('shipments', 'cod_payments');
create type public.import_status as enum ('pending', 'processing', 'done', 'failed');

-- ---------------------------------------------------------------------------
-- Mape kolona (pamte se po firmi i vrsti uvoza)
-- ---------------------------------------------------------------------------
create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind public.import_kind not null default 'shipments',
  name text not null default 'default',
  -- npr. {"tracking_number": "KOD ZA PRAĆENJE", "cod_amount": "Total otkup"}
  column_map jsonb not null check (jsonb_typeof(column_map) = 'object'),
  -- npr. {"sheet": "Sheet1", "header_row": 1}
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, kind, name)
);

create trigger import_mappings_updated_at
  before update on public.import_mappings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Uvozi: web pravi red sa statusom `pending`, worker ga obrađuje
-- ---------------------------------------------------------------------------
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind public.import_kind not null default 'shipments',
  source public.import_source not null default 'file',
  file_name text,
  -- putanja u Storage bucket-u `imports`: <tenant_id>/<import_id>/<fajl>
  file_path text,
  mapping_id uuid references public.import_mappings (id) on delete set null,
  status public.import_status not null default 'pending',
  rows_total integer not null default 0 check (rows_total >= 0),
  rows_ok integer not null default 0 check (rows_ok >= 0),
  rows_error integer not null default 0 check (rows_error >= 0),
  -- [{ "row": 12, "reason": "Nema broja pošiljke" }, ...]
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index imports_tenant_created_idx on public.imports (tenant_id, created_at desc);
create index imports_pending_idx on public.imports (created_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Pošiljke
-- ---------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  courier_code text not null check (courier_code ~ '^[a-z][a-z0-9_]{1,30}$'),
  tracking_number text not null check (tracking_number ~ '^\S{4,40}$'),
  -- broj porudžbine iz shopa, npr. PN/220554
  order_ref text,
  -- oznaka klijenta fulfillment centra, npr. NR (pod-klijenti kasnije)
  client_ref text,
  recipient_name text,
  recipient_phone text,
  recipient_address text,
  recipient_postal_code text,
  recipient_city text,
  cod_amount numeric(12, 2) not null default 0 check (cod_amount >= 0),
  currency char(3) not null default 'RSD',
  note text,
  -- [{ "sku": "NR0001", "name": "...", "qty": 1 }]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  status public.unified_status not null default 'created',
  raw_status text,
  status_description text,
  last_status_at timestamptz,
  last_polled_at timestamptz,
  last_poll_error text,
  is_final boolean not null default false,
  import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ponovni uvoz istog fajla ne pravi duplikate
  unique (tenant_id, courier_code, tracking_number),
  -- za kompozitne FK-ove: podređeni red ne može da pređe u drugu firmu
  unique (id, tenant_id)
);

create trigger shipments_updated_at
  before update on public.shipments
  for each row execute function private.set_updated_at();

-- Lista pošiljki (F06): filteri po statusu i datumu, pretraga
create index shipments_tenant_status_idx on public.shipments (tenant_id, status);
create index shipments_tenant_created_idx on public.shipments (tenant_id, created_at desc);
create index shipments_tenant_last_status_idx on public.shipments (tenant_id, last_status_at desc);
-- Polling (F04): samo aktivne pošiljke
create index shipments_active_idx on public.shipments (tenant_id, courier_code, last_polled_at nulls first)
  where not is_final;
create index shipments_order_ref_idx on public.shipments (tenant_id, order_ref);
create index shipments_tracking_trgm_idx on public.shipments
  using gin (tracking_number extensions.gin_trgm_ops);
create index shipments_recipient_name_trgm_idx on public.shipments
  using gin (recipient_name extensions.gin_trgm_ops);
create index shipments_recipient_phone_trgm_idx on public.shipments
  using gin (recipient_phone extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Istorija statusa (F04). Trenutni status = poslednji događaj po vremenu,
-- a kod istog vremena odlučuje redosled u odgovoru kurira (`seq`).
-- ---------------------------------------------------------------------------
create table public.shipment_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  shipment_id uuid not null,
  -- pozicija događaja u odgovoru kurira (0, 1, 2...)
  seq integer not null default 0 check (seq >= 0),
  raw_status text not null,
  raw_reason text,
  -- null kad je šifra kurira nepoznata (adapter je loguje)
  status public.unified_status,
  description text,
  location text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  foreign key (shipment_id, tenant_id)
    references public.shipments (id, tenant_id) on delete cascade,
  -- isti odgovor kurira obrađen dva puta ne pravi duplikat
  constraint shipment_events_dedupe
    unique nulls not distinct (shipment_id, raw_status, raw_reason, occurred_at)
);

create index shipment_events_timeline_idx
  on public.shipment_events (shipment_id, occurred_at desc, seq desc);
create index shipment_events_tenant_idx on public.shipment_events (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.import_mappings enable row level security;
alter table public.imports enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

revoke all on public.import_mappings, public.imports, public.shipments, public.shipment_events from anon;

-- Mape kolona: svaki član firme ih čita i čuva (operater radi uvoz)
create policy import_mappings_select on public.import_mappings
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));
create policy import_mappings_insert on public.import_mappings
  for insert to authenticated
  with check (tenant_id in (select private.auth_tenant_ids()));
create policy import_mappings_update on public.import_mappings
  for update to authenticated
  using (tenant_id in (select private.auth_tenant_ids()))
  with check (tenant_id in (select private.auth_tenant_ids()));
create policy import_mappings_delete on public.import_mappings
  for delete to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

revoke update on public.import_mappings from authenticated;
grant update (name, column_map, options) on public.import_mappings to authenticated;

-- Uvozi: član pravi uvoz u svojoj firmi, samo kao `pending`; dalje radi worker
create policy imports_select on public.imports
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));
create policy imports_insert on public.imports
  for insert to authenticated
  with check (
    tenant_id in (select private.auth_tenant_ids())
    and created_by = (select auth.uid())
    and status = 'pending'
    and rows_total = 0 and rows_ok = 0 and rows_error = 0
    and started_at is null and finished_at is null
  );

revoke update, delete on public.imports from authenticated;

-- Pošiljke i događaji: samo čitanje iz weba
create policy shipments_select on public.shipments
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

create policy shipment_events_select on public.shipment_events
  for select to authenticated
  using (tenant_id in (select private.auth_tenant_ids()));

revoke insert, update, delete on public.shipments, public.shipment_events from authenticated;

-- ---------------------------------------------------------------------------
-- Storage: privatan bucket za uvozne fajlove, putanja počinje sa tenant_id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imports', 'imports', false, 20971520,
  array[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy imports_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] in (select t::text from private.auth_tenant_ids() t)
  );

create policy imports_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] in (select t::text from private.auth_tenant_ids() t)
  );

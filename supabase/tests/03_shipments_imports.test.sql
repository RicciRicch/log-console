-- F02 + F04: pošiljke, istorija statusa, uvozi, mape kolona i Storage.
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.create_user(p_email text) returns uuid
language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', p_email, now(), '{}', '{}', now(), now())
  returning id
$$;

create function tests.login_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on all functions in schema tests to authenticated, anon;

create temp table ids (k text primary key, v uuid) on commit drop;
grant all on ids to authenticated, anon;

insert into ids values
  ('a_op',    tests.create_user('operater@firma-a.test')),
  ('b_op',    tests.create_user('operater@firma-b.test')),
  ('tenant_a', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('tenant_b', 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('ship_a',  'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('ship_b',  'bbbbbbbb-0000-0000-0000-0000000000b1');

insert into public.tenants (id, name) values
  ((select v from ids where k = 'tenant_a'), 'Firma A'),
  ((select v from ids where k = 'tenant_b'), 'Firma B');

insert into public.memberships (tenant_id, user_id, role) values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_op'), 'admin'),
  ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'b_op'), 'admin');

-- Worker (service) upisuje pošiljke
insert into public.shipments (id, tenant_id, courier_code, tracking_number, order_ref, client_ref,
                              recipient_name, recipient_city, cod_amount)
values
  ((select v from ids where k = 'ship_a'), (select v from ids where k = 'tenant_a'), 'bex', '900000001',
   'PN/000001', 'NR', 'Petar Test', 'Beograd', 3149),
  ((select v from ids where k = 'ship_b'), (select v from ids where k = 'tenant_b'), 'bex', '900000002',
   'PN/000002', null, 'Marija Test', 'Niš', 5848);

-- ---------------------------------------------------------------------------
-- RLS uključen
-- ---------------------------------------------------------------------------
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.shipments'::regclass, 'public.shipment_events'::regclass,
                 'public.imports'::regclass, 'public.import_mappings'::regclass)),
  'RLS je uključen na shipments, shipment_events, imports, import_mappings');

-- ---------------------------------------------------------------------------
-- Duplikati i integritet (worker)
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.shipments (tenant_id, courier_code, tracking_number)
    values ((select v from ids where k = 'tenant_a'), 'bex', '900000001')$$,
  '23505', null, 'ista pošiljka u istoj firmi se ne upisuje dvaput');

select lives_ok(
  $$insert into public.shipments (tenant_id, courier_code, tracking_number)
    values ((select v from ids where k = 'tenant_b'), 'bex', '900000001')$$,
  'isti broj pošiljke sme da postoji u drugoj firmi');

insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, occurred_at)
values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 0, '1', null, 'created', '2026-11-01 08:00+01'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 1, '11', null, 'in_transit', '2026-11-01 12:00+01'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 2, '11', '5', 'failed_delivery', '2026-11-02 10:00+01');

-- isti odgovor kurira drugi put (worker koristi on conflict do nothing)
insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, occurred_at)
values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 0, '1', null, 'created', '2026-11-01 08:00+01'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 2, '11', '5', 'failed_delivery', '2026-11-02 10:00+01')
on conflict on constraint shipment_events_dedupe do nothing;

select is((select count(*)::int from public.shipment_events where shipment_id = (select v from ids where k = 'ship_a')), 3,
  'ponovljen odgovor kurira ne pravi duplikate (i kad je razlog null)');

insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, occurred_at)
values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 3, '11', '5', 'failed_delivery', '2026-11-03 10:00+01');
select is((select count(*)::int from public.shipment_events
           where shipment_id = (select v from ids where k = 'ship_a') and status = 'failed_delivery'), 2,
  'dva neuspela pokušaja u različito vreme su dva događaja');

select throws_ok(
  $$insert into public.shipment_events (tenant_id, shipment_id, raw_status, occurred_at)
    values ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'ship_a'), '1', now())$$,
  '23503', null, 'događaj ne može da pripada drugoj firmi od pošiljke');

select lives_ok(
  $$insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, status, occurred_at)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 4, '99', null, now())$$,
  'događaj sa nepoznatom šifrom kurira se čuva sa status = null');

select throws_ok(
  $$insert into public.shipments (tenant_id, courier_code, tracking_number, cod_amount)
    values ((select v from ids where k = 'tenant_a'), 'bex', '900000099', -1)$$,
  '23514', null, 'otkup ne može da bude negativan');

-- ---------------------------------------------------------------------------
-- Operater firme A
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_op'));

select results_eq('select tracking_number from public.shipments',
  $$values ('900000001'::text)$$, 'operater A vidi samo pošiljke firme A');
select is((select count(*)::int from public.shipment_events), 5, 'operater A vidi istoriju samo svojih pošiljki');

select throws_ok(
  $$insert into public.shipments (tenant_id, courier_code, tracking_number)
    values ((select v from ids where k = 'tenant_a'), 'bex', '900000050')$$,
  '42501', null, 'web ne upisuje pošiljke direktno (radi worker)');
select throws_ok(
  $$update public.shipments set status = 'delivered'$$,
  '42501', null, 'web ne menja status pošiljke');
select throws_ok(
  $$insert into public.shipment_events (tenant_id, shipment_id, raw_status, occurred_at)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), '21', now())$$,
  '42501', null, 'web ne upisuje događaje');

-- Uvoz: operater pravi `pending` uvoz u svojoj firmi
select lives_ok(
  $$insert into public.imports (tenant_id, file_name) values ((select v from ids where k = 'tenant_a'), 'danas.xlsx')$$,
  'operater pravi uvoz u svojoj firmi');
select is((select created_by from public.imports), (select v from ids where k = 'a_op'),
  'uvoz pamti ko ga je napravio');
select throws_ok(
  $$insert into public.imports (tenant_id, status) values ((select v from ids where k = 'tenant_a'), 'done')$$,
  '42501', null, 'web ne može da označi uvoz kao završen');
select throws_ok(
  $$insert into public.imports (tenant_id) values ((select v from ids where k = 'tenant_b'))$$,
  '42501', null, 'operater A ne pravi uvoz u firmi B');

-- Mapa kolona se pamti po firmi
select lives_ok(
  $$insert into public.import_mappings (tenant_id, column_map)
    values ((select v from ids where k = 'tenant_a'), '{"tracking_number": "KOD ZA PRAĆENJE"}')$$,
  'operater čuva mapu kolona za svoju firmu');

-- Storage: samo folder svoje firme
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('imports', (select v from ids where k = 'tenant_a')::text || '/u1/danas.xlsx', (select v from ids where k = 'a_op'))$$,
  'operater A upload-uje fajl u folder firme A');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('imports', (select v from ids where k = 'tenant_b')::text || '/u1/tudje.xlsx', (select v from ids where k = 'a_op'))$$,
  '42501', null, 'operater A ne može da upload-uje u folder firme B');
reset role;

-- ---------------------------------------------------------------------------
-- Operater firme B ne vidi ništa od A
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'b_op'));
select is((select count(*)::int from public.import_mappings), 0, 'firma B ne vidi mape kolona firme A');
select is((select count(*)::int from storage.objects where bucket_id = 'imports'), 0,
  'firma B ne vidi uvozne fajlove firme A');
reset role;

select * from finish();
rollback;

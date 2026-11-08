-- F05 + F08: upozorenja i Google Sheet veze.
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

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
  ('a_admin', tests.create_user('admin@firma-a.test')),
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
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_admin'), 'admin'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_op'), 'operator'),
  ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'b_op'), 'admin');

insert into public.shipments (id, tenant_id, courier_code, tracking_number) values
  ((select v from ids where k = 'ship_a'), (select v from ids where k = 'tenant_a'), 'bex', '900000001'),
  ((select v from ids where k = 'ship_b'), (select v from ids where k = 'tenant_b'), 'bex', '900000002');

-- Worker otvara upozorenja
insert into public.alerts (tenant_id, shipment_id, type, details) values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 'failed_delivery', '{"attempts": 2}'),
  ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'ship_b'), 'stuck', '{}');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.alerts'::regclass, 'public.sheet_connections'::regclass)),
  'RLS je uključen na alerts i sheet_connections');

select throws_ok(
  $$insert into public.alerts (tenant_id, shipment_id, type)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 'failed_delivery')$$,
  '23505', null, 'najviše jedno otvoreno upozorenje iste vrste po pošiljci');

-- ---------------------------------------------------------------------------
-- Operater A
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_op'));

select is((select count(*)::int from public.alerts), 1, 'operater A vidi samo upozorenja firme A');

update public.alerts
set resolved_at = now(), resolution = 'manual', resolved_by = (select v from ids where k = 'a_op')
where shipment_id = (select v from ids where k = 'ship_a');
select is((select resolution::text from public.alerts where shipment_id = (select v from ids where k = 'ship_a')), 'manual',
  'operater ručno zatvara upozorenje');

-- pokušaj da zatvori upozorenje firme B: nema efekta
update public.alerts
set resolved_at = now(), resolution = 'manual', resolved_by = (select v from ids where k = 'a_op')
where shipment_id = (select v from ids where k = 'ship_b');

select throws_ok(
  $$update public.alerts set details = '{}'$$,
  '42501', null, 'web ne menja detalje upozorenja');
select throws_ok(
  $$insert into public.alerts (tenant_id, shipment_id, type)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 'stuck')$$,
  '42501', null, 'web ne otvara upozorenja (radi worker)');

select throws_ok(
  $$insert into public.sheet_connections (tenant_id, spreadsheet_id, sheet_name, tracking_column, status_column)
    values ((select v from ids where k = 'tenant_a'), 'abcdefghij1234567890', 'Sheet1', 'L', 'O')$$,
  '42501', null, 'operater ne povezuje Google Sheet');
reset role;

select is((select resolved_at is null from public.alerts where shipment_id = (select v from ids where k = 'ship_b')), true,
  'upozorenje firme B je ostalo otvoreno');

select lives_ok(
  $$insert into public.alerts (tenant_id, shipment_id, type)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'ship_a'), 'failed_delivery')$$,
  'posle zatvaranja worker sme da otvori novo upozorenje iste vrste');

-- ---------------------------------------------------------------------------
-- Admin A: Google Sheet
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_admin'));
select lives_ok(
  $$insert into public.sheet_connections (tenant_id, spreadsheet_id, sheet_name, tracking_column, status_column)
    values ((select v from ids where k = 'tenant_a'), 'abcdefghij1234567890', 'Sheet1', 'L', 'O')$$,
  'admin povezuje Google Sheet');
select throws_ok(
  $$update public.sheet_connections set last_error = null$$,
  '42501', null, 'last_error piše samo worker');
reset role;

select tests.login_as((select v from ids where k = 'b_op'));
select is((select count(*)::int from public.sheet_connections), 0, 'firma B ne vidi Sheet veze firme A');
select is((select count(*)::int from public.alerts where tenant_id = (select v from ids where k = 'tenant_a')), 0,
  'firma B ne vidi upozorenja firme A');
reset role;

select * from finish();
rollback;

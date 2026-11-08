-- F07: faze otkupa, sparivanje uplata i isplata.
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

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

-- p_aal: 'aal1' (lozinka) ili 'aal2' (lozinka + MFA)
create function tests.login_as(p_user uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on all functions in schema tests to authenticated, anon;

create temp table ids (k text primary key, v uuid) on commit drop;
grant all on ids to authenticated, anon;

insert into ids values
  ('a_admin', tests.create_user('admin@firma-a.test')),
  ('a_op',    tests.create_user('operater@firma-a.test')),
  ('b_admin', tests.create_user('admin@firma-b.test')),
  ('tenant_a', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('tenant_b', 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('s1', 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('s2', 'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('s3', 'aaaaaaaa-0000-0000-0000-0000000000a3'),
  ('sb', 'bbbbbbbb-0000-0000-0000-0000000000b1');

insert into public.tenants (id, name) values
  ((select v from ids where k = 'tenant_a'), 'Firma A'),
  ((select v from ids where k = 'tenant_b'), 'Firma B');

insert into public.memberships (tenant_id, user_id, role) values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_admin'), 'admin'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_op'), 'operator'),
  ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'b_admin'), 'admin');

-- Worker uvozi pošiljke: s1 i s2 imaju otkup, s3 nema
insert into public.shipments (id, tenant_id, courier_code, tracking_number, client_ref, cod_amount) values
  ((select v from ids where k = 's1'), (select v from ids where k = 'tenant_a'), 'bex', '900000001', 'NR', 3149),
  ((select v from ids where k = 's2'), (select v from ids where k = 'tenant_a'), 'bex', '900000002', 'NR', 5848),
  ((select v from ids where k = 's3'), (select v from ids where k = 'tenant_a'), 'bex', '900000003', 'NR', 0),
  ((select v from ids where k = 'sb'), (select v from ids where k = 'tenant_b'), 'bex', '900000009', null, 1000);

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.cod_items'::regclass, 'public.cod_payments'::regclass, 'public.payouts'::regclass)),
  'RLS je uključen na cod_items, cod_payments, payouts');

-- ---------------------------------------------------------------------------
-- Faze se menjaju same sa statusom
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.cod_items where tenant_id = (select v from ids where k = 'tenant_a')), 2,
  'otkup postoji samo za pošiljke sa iznosom većim od 0');
select is((select phase::text from public.cod_items where shipment_id = (select v from ids where k = 's1')),
  'awaiting_collection', 'nova pošiljka: Čeka naplatu');

update public.shipments set status = 'delivered', last_status_at = '2026-10-15 14:00+02'
where id in ((select v from ids where k = 's1'), (select v from ids where k = 's2'));
select is((select phase::text from public.cod_items where shipment_id = (select v from ids where k = 's1')),
  'collected_by_courier', 'isporučeno: Naplaćeno, kod kurira');

update public.shipments set status = 'failed_delivery' where id = (select v from ids where k = 's2');
select is((select phase::text from public.cod_items where shipment_id = (select v from ids where k = 's2')),
  'awaiting_collection', 'kurir ispravio Dostavljeno u neuspelu dostavu: faza se vraća');
update public.shipments set status = 'delivered' where id = (select v from ids where k = 's2');

-- ---------------------------------------------------------------------------
-- Uvoz specifikacije i sparivanje (worker)
-- ---------------------------------------------------------------------------
insert into public.cod_payments (tenant_id, courier_code, tracking_number, amount, paid_on, client_ref) values
  ((select v from ids where k = 'tenant_a'), 'bex', '900000001', 3149, '2026-10-19', 'NR'),
  ((select v from ids where k = 'tenant_a'), 'bex', '900000002', 5000, '2026-10-19', 'NR'),
  ((select v from ids where k = 'tenant_a'), 'bex', '900000077', 2259, '2026-10-19', 'NR');

-- isti izveštaj uvezen drugi put
insert into public.cod_payments (tenant_id, courier_code, tracking_number, amount, paid_on, client_ref) values
  ((select v from ids where k = 'tenant_a'), 'bex', '900000001', 3149, '2026-10-19', 'NR')
on conflict (tenant_id, courier_code, tracking_number) do nothing;
select is((select count(*)::int from public.cod_payments where tenant_id = (select v from ids where k = 'tenant_a')), 3,
  'isti izveštaj uvezen dva puta ne duplira uplate');

select is(public.match_cod_payments((select v from ids where k = 'tenant_a')),
  '{"matched": 2, "unmatched": 1}'::jsonb, 'sparivanje: 2 sparene, 1 nesparena');
select is(public.match_cod_payments((select v from ids where k = 'tenant_a')),
  '{"matched": 2, "unmatched": 1}'::jsonb, 'ponovno sparivanje daje isti rezultat');

select is((select phase::text from public.cod_items where shipment_id = (select v from ids where k = 's1')),
  'paid_by_courier', 'sparena uplata: Kurir uplatio');
select is((select courier_paid_on from public.cod_items where shipment_id = (select v from ids where k = 's1')),
  '2026-10-19'::date, 'pamti se datum naplate');
select matches((select match_error from public.cod_payments where tracking_number = '900000002'),
  '^Iznos se razlikuje', 'različit iznos se označava, a uplata je ipak sparena');
select is((select match_error from public.cod_payments where tracking_number = '900000077'),
  'Pošiljka nije u konzoli', 'nesparena uplata ima razlog');

-- pošiljka stigne kasnije: ponovo sparivanje
insert into public.shipments (tenant_id, courier_code, tracking_number, cod_amount, status)
values ((select v from ids where k = 'tenant_a'), 'bex', '900000077', 2259, 'delivered');
select is(public.match_cod_payments((select v from ids where k = 'tenant_a')),
  '{"matched": 3, "unmatched": 0}'::jsonb, 'kasnije uvezena pošiljka se spari pri sledećem pokretanju');

update public.shipments set status = 'failed_delivery' where id = (select v from ids where k = 's1');
select is((select phase::text from public.cod_items where shipment_id = (select v from ids where k = 's1')),
  'paid_by_courier', 'kad je kurir uplatio, promena statusa ne vraća fazu');
update public.shipments set status = 'delivered' where id = (select v from ids where k = 's1');

-- ---------------------------------------------------------------------------
-- Isplata
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_op'), 'aal2');
select throws_ok(
  $$select public.create_payout((select v from ids where k = 'tenant_a'),
      array(select id from public.cod_items where phase = 'paid_by_courier'))$$,
  '42501', null, 'operater ne može da označi isplatu');
select throws_ok('select public.match_cod_payments(null)', '42501', null,
  'web ne pokreće sparivanje direktno');
reset role;

select tests.login_as((select v from ids where k = 'a_admin'), 'aal1');
select throws_ok(
  $$select public.create_payout((select v from ids where k = 'tenant_a'),
      array(select id from public.cod_items where phase = 'paid_by_courier'))$$,
  '42501', 'Isplata traži dvostepenu prijavu (MFA)', 'admin bez MFA ne može da isplati');
reset role;

select tests.login_as((select v from ids where k = 'a_admin'), 'aal2');
select throws_ok(
  $$select public.create_payout((select v from ids where k = 'tenant_a'),
      array(select id from public.cod_items where shipment_id = (select v from ids where k = 'sb')))$$,
  '22023', null, 'otkup druge firme ne može u isplatu');

select lives_ok(
  $$select public.create_payout((select v from ids where k = 'tenant_a'),
      array(select id from public.cod_items where shipment_id in ((select v from ids where k = 's1'), (select v from ids where k = 's2'))),
      'Isplata za NR')$$,
  'admin sa MFA označava isplatu');

select results_eq('select total, item_count, client_ref from public.payouts',
  $$values (8149.00::numeric(14,2), 2, 'NR'::text)$$, 'isplata ima zbir, broj stavki i klijenta');

select throws_ok(
  $$select public.create_payout((select v from ids where k = 'tenant_a'),
      array(select id from public.cod_items where shipment_id = (select v from ids where k = 's1')))$$,
  '22023', null, 'isti otkup ne može da se isplati dvaput');

select is((select count(*)::int from public.audit_log where action = 'payout.created'), 1,
  'isplata je upisana u audit log');
select throws_ok($$update public.cod_items set phase = 'paid_out'$$, '42501', null,
  'web ne menja fazu direktno');
reset role;

select tests.login_as((select v from ids where k = 'b_admin'), 'aal2');
select is((select count(*)::int from public.cod_items), 1, 'firma B vidi samo svoje otkupe');
reset role;

select * from finish();
rollback;

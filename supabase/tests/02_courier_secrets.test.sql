-- F01 / ADR-008: kurirski ključ u Vault-u, prikaz samo poslednje 4 cifre, audit log.
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

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
  ('b_admin', tests.create_user('admin@firma-b.test')),
  ('tenant_a', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('tenant_b', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into public.tenants (id, name) values
  ((select v from ids where k = 'tenant_a'), 'Firma A'),
  ((select v from ids where k = 'tenant_b'), 'Firma B');

insert into public.memberships (tenant_id, user_id, role) values
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_admin'), 'admin'),
  ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_op'), 'operator'),
  ((select v from ids where k = 'tenant_b'), (select v from ids where k = 'b_admin'), 'admin');

select ok((select relrowsecurity from pg_class where oid = 'public.courier_accounts'::regclass),
  'RLS je uključen na courier_accounts');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass),
  'RLS je uključen na audit_log');

-- ---------------------------------------------------------------------------
-- Admin A unosi ključ
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_admin'));

select is(public.set_courier_secret((select v from ids where k = 'tenant_a'), 'BEX', '  test-kljuc-1234  '),
  '1234', 'admin A unosi BEX ključ i dobija poslednje 4 cifre');

select results_eq(
  'select courier_code, secret_last4, is_default from public.courier_accounts',
  $$values ('bex'::text, '1234'::text, true)$$,
  'admin A vidi nalog sa ••••1234; prvi nalog je podrazumevani');

select throws_ok(
  $$select public.get_courier_secret((select v from ids where k = 'tenant_a'), 'bex')$$,
  '42501', null, 'web (authenticated) ne može da pročita dešifrovan ključ');

select throws_ok('select count(*) from vault.decrypted_secrets', '42501', null,
  'web (authenticated) nema pristup Vault-u');

select throws_ok(
  $$update public.courier_accounts set secret_last4 = '0000'$$,
  '42501', null, 'secret_last4 se ne menja direktno, samo kroz set_courier_secret');

select is(public.set_courier_secret((select v from ids where k = 'tenant_a'), 'bex', 'novi-kljuc-9876'),
  '9876', 'admin A menja ključ');

select throws_ok(
  $$select public.set_courier_secret((select v from ids where k = 'tenant_a'), 'bex', 'kratak')$$,
  '22023', 'API ključ je prekratak', 'prekratak ključ se odbija');

select is((select count(*)::int from public.audit_log where action like 'courier_secret.%'), 2,
  'admin A vidi 2 audit zapisa za ključ (unos i zamena)');
reset role;

select is((select count(*)::int from public.courier_accounts where tenant_id = (select v from ids where k = 'tenant_a')), 1,
  'zamena ključa ne pravi novi nalog');
select is((select count(*)::int from vault.secrets where description = 'API ključ kurira bex'), 1,
  'zamena ključa menja isti Vault zapis');
select is(public.get_courier_secret((select v from ids where k = 'tenant_a'), 'BEX'), 'novi-kljuc-9876',
  'worker (service) čita novi dešifrovan ključ');
select is((select count(*)::int from public.audit_log where data::text like '%kljuc%'), 0,
  'ključ nikad ne završi u audit logu');
select is((select array_agg(action order by id) from public.audit_log where action like 'courier_secret.%'),
  array['courier_secret.created', 'courier_secret.replaced'], 'audit razlikuje unos i zamenu');

-- ---------------------------------------------------------------------------
-- Operater A i admin B
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_op'));
select throws_ok(
  $$select public.set_courier_secret((select v from ids where k = 'tenant_a'), 'bex', 'operater-1111')$$,
  '42501', null, 'operater ne može da unese ključ');
select is((select count(*)::int from public.audit_log), 0, 'operater ne vidi audit log');
reset role;

select tests.login_as((select v from ids where k = 'b_admin'));
select throws_ok(
  $$select public.set_courier_secret((select v from ids where k = 'tenant_a'), 'bex', 'uljez-kljuc-2222')$$,
  '42501', null, 'admin firme B ne može da menja ključ firme A');
select is((select count(*)::int from public.courier_accounts), 0, 'admin B ne vidi naloge firme A');
reset role;

select * from finish();
rollback;

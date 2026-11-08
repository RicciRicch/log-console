-- F01: tenant_members vraća email kolega samo iz sopstvene firme.
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

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

select tests.login_as((select v from ids where k = 'a_op'));
select results_eq(
  $$select email from public.tenant_members((select v from ids where k = 'tenant_a'))$$,
  $$values ('admin@firma-a.test'::text), ('operater@firma-a.test'::text)$$,
  'operater A vidi email kolega iz firme A');
select is_empty(
  $$select * from public.tenant_members((select v from ids where k = 'tenant_b'))$$,
  'operater A ne vidi članove firme B');
reset role;

select tests.login_as((select v from ids where k = 'b_admin'));
select is_empty(
  $$select * from public.tenant_members((select v from ids where k = 'tenant_a'))$$,
  'admin B ne vidi članove firme A');
reset role;

set local role anon;
select throws_ok($$select * from public.tenant_members(null)$$, '42501', null, 'anon ne poziva tenant_members');
reset role;

select * from finish();
rollback;

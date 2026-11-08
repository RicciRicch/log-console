-- F01: izolacija firmi i uloge (tenants, tenant_settings, memberships, invitations).
-- Svi podaci su izmišljeni. Sve se vraća na kraju (rollback).
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije za test (postoje samo u ovoj transakciji)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.create_user(p_email text, p_confirmed boolean default true) returns uuid
language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', p_email, case when p_confirmed then now() end,
          '{}', '{}', now(), now())
  returning id
$$;

-- Prijava kao korisnik: uloga authenticated + JWT claims (auth.uid())
create function tests.login_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on all functions in schema tests to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Podaci: firma A (admin + operater), firma B (admin), korisnik bez firme
-- ---------------------------------------------------------------------------
create temp table ids (k text primary key, v uuid) on commit drop;
grant all on ids to authenticated, anon;

insert into ids values
  ('a_admin', tests.create_user('admin@firma-a.test')),
  ('a_op',    tests.create_user('operater@firma-a.test')),
  ('b_admin', tests.create_user('admin@firma-b.test')),
  ('outsider', tests.create_user('neko@drugde.test')),
  ('unconfirmed', tests.create_user('nepotvrdjen@firma-a.test', false));

insert into ids values
  ('tenant_a', public.create_tenant('Firma A', 'ADMIN@firma-a.test ')),
  ('tenant_b', public.create_tenant('Firma B', 'admin@firma-b.test'));

insert into public.memberships (tenant_id, user_id, role)
values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'a_op'), 'operator');

-- ---------------------------------------------------------------------------
-- RLS je uključen na svim tabelama
-- ---------------------------------------------------------------------------
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.tenants'::regclass, 'public.tenant_settings'::regclass,
                 'public.memberships'::regclass, 'public.invitations'::regclass)),
  'RLS je uključen na tenants, tenant_settings, memberships, invitations');

select is((select count(*)::int from public.tenant_settings
           where tenant_id in (select v from ids where k in ('tenant_a', 'tenant_b'))), 2,
  'svaka nova firma dobija podešavanja');

-- ---------------------------------------------------------------------------
-- Prihvatanje poziva (create_tenant pravi poziv za prvog admina)
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_admin'));
select is(public.accept_invitations(), 1, 'admin firme A prihvata poziv (email bez obzira na velika slova)');
select is(public.accept_invitations(), 0, 'drugi put nema šta da se prihvati');
reset role;

select tests.login_as((select v from ids where k = 'b_admin'));
select is(public.accept_invitations(), 1, 'admin firme B prihvata poziv');
reset role;

select tests.login_as((select v from ids where k = 'outsider'));
select is(public.accept_invitations(), 0, 'korisnik bez poziva ne dobija članstvo');
select is((select count(*)::int from public.tenants), 0, 'korisnik bez firme ne vidi nijednu firmu');
reset role;

-- ---------------------------------------------------------------------------
-- Admin firme A: vidi samo svoje, menja samo svoje
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_admin'));

select results_eq('select id from public.tenants',
  $$select v from ids where k = 'tenant_a'$$,
  'admin A vidi samo firmu A');
select is((select count(*)::int from public.memberships), 2, 'admin A vidi samo 2 člana firme A');
select is((select count(*)::int from public.tenant_settings), 1, 'admin A vidi samo podešavanja firme A');

update public.tenant_settings set stuck_after_days = 5;
update public.memberships set role = 'admin' where tenant_id = (select v from ids where k = 'tenant_b');

insert into public.invitations (tenant_id, email, role, invited_by)
values ((select v from ids where k = 'tenant_a'), 'novi@firma-a.test', 'operator', (select v from ids where k = 'a_admin'));
select is((select count(*)::int from public.invitations where accepted_at is null), 1,
  'admin A poziva novog operatera i vidi samo pozive firme A');

select throws_ok(
  $$insert into public.invitations (tenant_id, email, invited_by)
    values ((select v from ids where k = 'tenant_b'), 'uljez@firma-b.test', (select v from ids where k = 'a_admin'))$$,
  '42501', null, 'admin A ne može da pozove nekoga u firmu B');

select throws_ok(
  $$update public.memberships set role = 'operator' where user_id = (select v from ids where k = 'a_admin')$$,
  'P0001', 'Firma mora da ima bar jednog aktivnog administratora',
  'jedini admin ne može sebi da oduzme admin ulogu');

select throws_ok(
  $$update public.memberships set user_id = (select v from ids where k = 'outsider')
    where user_id = (select v from ids where k = 'a_op')$$,
  '42501', null, 'admin ne može da menja user_id članstva (samo role i is_active)');
reset role;

select is((select stuck_after_days from public.tenant_settings where tenant_id = (select v from ids where k = 'tenant_a')), 5,
  'admin A je promenio podešavanja firme A');
select is((select stuck_after_days from public.tenant_settings where tenant_id = (select v from ids where k = 'tenant_b')), 3,
  'podešavanja firme B nisu dirana');

-- ---------------------------------------------------------------------------
-- Operater firme A: čita, ali ne menja korisnike, pozive ni podešavanja
-- ---------------------------------------------------------------------------
select tests.login_as((select v from ids where k = 'a_op'));

select is((select count(*)::int from public.tenants), 1, 'operater A vidi firmu A');
select is((select count(*)::int from public.invitations), 0, 'operater ne vidi pozive');

update public.tenant_settings set stuck_after_days = 10;
update public.memberships set role = 'admin' where user_id = (select v from ids where k = 'a_op');

select throws_ok(
  $$insert into public.invitations (tenant_id, email, invited_by)
    values ((select v from ids where k = 'tenant_a'), 'x@firma-a.test', (select v from ids where k = 'a_op'))$$,
  '42501', null, 'operater ne može da poziva korisnike');

select throws_ok(
  $$insert into public.memberships (tenant_id, user_id, role)
    values ((select v from ids where k = 'tenant_a'), (select v from ids where k = 'outsider'), 'admin')$$,
  '42501', null, 'niko iz weba ne pravi članstvo direktno');
reset role;

select is((select stuck_after_days from public.tenant_settings where tenant_id = (select v from ids where k = 'tenant_a')), 5,
  'operater nije mogao da promeni podešavanja');
select is((select role::text from public.memberships where user_id = (select v from ids where k = 'a_op')), 'operator',
  'operater nije mogao sebi da da admin ulogu');

-- ---------------------------------------------------------------------------
-- Deaktiviran član više ne vidi firmu; nepotvrđen email ne prima poziv
-- ---------------------------------------------------------------------------
update public.memberships set is_active = false where user_id = (select v from ids where k = 'a_op');
select tests.login_as((select v from ids where k = 'a_op'));
select is((select count(*)::int from public.tenants), 0, 'deaktiviran operater ne vidi ništa');
reset role;

insert into public.invitations (tenant_id, email) values ((select v from ids where k = 'tenant_a'), 'nepotvrdjen@firma-a.test');
select tests.login_as((select v from ids where k = 'unconfirmed'));
select is(public.accept_invitations(), 0, 'korisnik bez potvrđenog email-a ne prima poziv');
reset role;

-- ---------------------------------------------------------------------------
-- anon i create_tenant
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok('select count(*) from public.tenants', '42501', null, 'anon nema pristup tabelama');
reset role;

select tests.login_as((select v from ids where k = 'a_admin'));
select throws_ok($$select public.create_tenant('Lažna', 'x@y.test')$$, '42501', null,
  'običan korisnik ne može da otvori firmu');
reset role;

-- Brisanje cele firme nije blokirano pravilom "poslednji admin"
delete from public.tenants where id = (select v from ids where k = 'tenant_b');
select is((select count(*)::int from public.memberships where tenant_id = (select v from ids where k = 'tenant_b')), 0,
  'brisanje firme briše i njena članstva');

select * from finish();
rollback;

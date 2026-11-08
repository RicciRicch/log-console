-- Seed: SAMO izmišljeni podaci, nikad pravi kupci (CONTRIBUTING.md §5).
-- Pokreće se lokalno i u CI-ju (`supabase start` / `supabase db reset`), ne na produkciji.
--
-- Probni nalozi (lozinka za sve: Test1234!):
--   admin@demo-shop.test      admin    Demo Shop
--   operater@demo-shop.test   operater Demo Shop
--   admin@demo-fulfil.test    admin    Demo Fulfillment
--   operater@demo-fulfil.test operater Demo Fulfillment (i operater u Demo Shop-u)

-- ---------------------------------------------------------------------------
-- Korisnici
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@demo-shop.test'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'operater@demo-shop.test'),
  ('20000000-0000-0000-0000-000000000001'::uuid, 'admin@demo-fulfil.test'),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'operater@demo-fulfil.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%.test';

-- ---------------------------------------------------------------------------
-- Firme i članstva
-- ---------------------------------------------------------------------------
insert into public.tenants (id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Demo Shop'),
  ('b0000000-0000-0000-0000-000000000002', 'Demo Fulfillment');

insert into public.memberships (tenant_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'operator'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'operator'),
  -- isti korisnik u dve firme (izbor firme posle prijave)
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'operator');

-- ---------------------------------------------------------------------------
-- Pošiljke: 30 po firmi, različiti statusi, izmišljeni primaoci
-- ---------------------------------------------------------------------------
with names (i, first_name, last_name, city, postal) as (
  values (0, 'Ana', 'Test', 'Beograd', '11000'), (1, 'Marko', 'Primer', 'Novi Sad', '21000'),
         (2, 'Jelena', 'Probna', 'Niš', '18000'), (3, 'Nikola', 'Izmišljen', 'Kragujevac', '34000'),
         (4, 'Milica', 'Demo', 'Subotica', '24000'), (5, 'Stefan', 'Lažni', 'Čačak', '32000')
),
statuses (i, status, raw_status) as (
  values (0, 'created'::public.unified_status, '1'), (1, 'in_transit', '11'), (2, 'in_transit', '11'),
         (3, 'failed_delivery', '11'), (4, 'delivered', '21'), (5, 'delivered', '21'),
         (6, 'delivered', '21'), (7, 'returning', '25'), (8, 'returned', '30'), (9, 'in_transit', '11')
),
tenants (tenant_id, prefix, client_ref) as (
  values ('a0000000-0000-0000-0000-000000000001'::uuid, '91', null::text),
         ('b0000000-0000-0000-0000-000000000002'::uuid, '92', 'DS')
)
insert into public.shipments (tenant_id, courier_code, tracking_number, order_ref, client_ref,
                              recipient_name, recipient_phone, recipient_address, recipient_postal_code,
                              recipient_city, cod_amount, status, raw_status, last_status_at, is_final, created_at)
select t.tenant_id, 'bex',
       t.prefix || lpad(g::text, 7, '0'),
       'PN/' || (100000 + g),
       t.client_ref,
       n.first_name || ' ' || n.last_name,
       -- očigledno lažan broj (počinje sa 0000)
       '0000' || lpad(g::text, 6, '0'),
       'Izmišljena ulica ' || g,
       n.postal, n.city,
       case when g % 5 = 0 then 0 else 1000 + (g * 337 % 9000) end,
       s.status, s.raw_status,
       now() - (g || ' hours')::interval,
       s.status in ('delivered', 'returned'),
       now() - ((g + 24) || ' hours')::interval
from tenants t
cross join generate_series(1, 30) g
join names n on n.i = g % 6
join statuses s on s.i = g % 10;

-- Istorija: "Evidentirano" za sve, pa "Preuzeto" za one koje je kurir preuzeo, pa poslednji status
insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, description, occurred_at)
select s.tenant_id, s.id, 0, '1', null, 'created', 'Evidentirano', s.created_at
from public.shipments s;

insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, description, occurred_at)
select s.tenant_id, s.id, 1, '11', null, 'in_transit', 'Preuzeto', s.created_at + interval '6 hours'
from public.shipments s
where s.status <> 'created';

insert into public.shipment_events (tenant_id, shipment_id, seq, raw_status, raw_reason, status, description, occurred_at)
select s.tenant_id, s.id, 2, s.raw_status,
       case when s.status = 'failed_delivery' then '5' end,
       s.status,
       case s.status
         when 'failed_delivery' then 'Bio na adresi - Ne javlja se na telefon'
         when 'delivered' then 'Dostavljeno'
         when 'returning' then 'Vratiti pošiljaocu'
         when 'returned' then 'Vraćena pošiljaocu'
       end,
       s.last_status_at
from public.shipments s
where s.status not in ('created', 'in_transit');

-- Upozorenje za pošiljke sa neuspelom dostavom
insert into public.alerts (tenant_id, shipment_id, type, details)
select s.tenant_id, s.id, 'failed_delivery',
       jsonb_build_object('attempts', 1, 'reason', 'Bio na adresi - Ne javlja se na telefon')
from public.shipments s
where s.status = 'failed_delivery';

-- Uplate kurira za deo isporučenih pošiljki (Demo Fulfillment), pa sparivanje
insert into public.cod_payments (tenant_id, courier_code, tracking_number, amount, paid_on, client_ref)
select s.tenant_id, s.courier_code, s.tracking_number, s.cod_amount, current_date - 1, s.client_ref
from public.shipments s
where s.tenant_id = 'b0000000-0000-0000-0000-000000000002'
  and s.status = 'delivered' and s.cod_amount > 0
  and right(s.tracking_number, 1) in ('4', '5');

select public.match_cod_payments('b0000000-0000-0000-0000-000000000002');

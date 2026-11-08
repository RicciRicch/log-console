# F01: Firme, korisnici i uloge

**Status:** Spec · **Vlasnik:** Uroš · **Faza:** M0 · **Zavisi od:** F00

## Cilj
Svaka firma ima svoj zatvoren prostor. Korisnici se prijavljuju i vide samo podatke svoje firme, u skladu sa ulogom.

## Korisnička priča
Kao administrator firme, želim da pozovem svoje operatere i unesem BEX API ključ, da bi tim mogao da radi u konzoli.

## Obim
**Ulazi:** login (email + lozinka, magic link), firme, pozivanje korisnika, uloge `admin` i `operator`, unos kurirskih ključeva, RLS na svim tabelama.
**Ne ulazi:** pod-klijenti, SSO, naplata pretplate.

## Kriterijumi prihvatanja
- [ ] Korisnik firme A ne može da pročita ni izmeni ništa od firme B (SQL test)
- [ ] Operater ne može da menja korisnike ni API ključeve (RLS, ne samo UI)
- [ ] API ključ se posle unosa prikazuje samo kao `••••1234`
- [ ] Vlasnik platforme može da otvori novu firmu (za sada kroz skriptu ili SQL)
- [ ] MFA dostupan za administratore

## Tehničke beleške
- Tabele: `tenants`, `tenant_settings`, `memberships`, `courier_accounts`, `audit_log`
- Helper u SQL-u: `auth_tenant_ids()` za RLS politike
- Ključevi u Supabase Vault, u `courier_accounts` samo `vault_secret_id` i `secret_last4` (za prikaz `••••1234`)
- Unos i zamena ključa preko `set_courier_secret` (`SECURITY DEFINER`, samo admin), poziva se iz Server Action-a. Vidi ADR-008.

## Zadaci
- [x] Migracije za tabele i RLS politike (`20261108200000`, `20261108200100`)
- [x] RLS testovi izolacije (`supabase/tests/01`, `02`)
- [x] Funkcija `set_courier_secret` + SQL test (operater i druga firma dobijaju grešku)
- [x] Pozivi korisnika bez `service_role`: tabela `invitations` + `accept_invitations()` posle prijave
- [x] `create_tenant(name, admin_email)` za vlasnika platforme (samo `service_role`)
- [x] Login ekran (lozinka + link na email) i izbor firme (ako je korisnik u više firmi)
- [x] Ekran "Korisnici" (poziv, uloga, deaktivacija); emailovi kolega kroz `tenant_members()`
- [x] Ekran "Kuriri" (unos/zamena API ključa kroz `set_courier_secret`, prikaz `••••1234`)
- [x] Seed: 2 firme, po admin i operater (+ jedan operater u obe firme); seed je i na staging bazi
- [x] Ekran "Bezbednost": uključivanje MFA (TOTP) i promena lozinke; posle lozinke se traži kod ako je MFA uključen
- [ ] UI prolazi `/impeccable audit` (Dule; ekrani koriste privremene klase iz `apps/web/src/components/ui.ts`)

## Otvorena pitanja
- ~~Da li jedan korisnik može da bude u više firmi?~~ Da, `memberships` to podržava.
- Poziv novog korisnika: admin upisuje email, a kolega sam traži link na stranici za prijavu (link mora da se otvori u istom browseru, PKCE). Supabase-ov email ima mali limit (par mejlova na sat); pre pilota treba naš SMTP.
- Za link na email na staging-u treba u Supabase podešavanjima (Auth → URL Configuration) dodati adresu aplikacije (npr. `http://localhost:3000/auth/callback`, kasnije Vercel adresa).

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Uroš | Šema, RLS, pozivi, Vault ključ, audit log i seed (grana `feat/M0-temelj`). Ostaju ekrani |
| 08.11.2026. | Uroš | Ekrani: prijava, MFA, izbor firme, Korisnici, Kuriri, Bezbednost (grana `feat/M0-ekrani`) |

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
- [ ] Login ekran i izbor firme (ako je korisnik u više firmi)
- [ ] Ekran "Korisnici" (poziv, uloga, deaktivacija)
- [ ] Ekran "Kuriri" (unos/zamena API ključa)
- [x] Seed: 2 firme, po admin i operater (+ jedan operater u obe firme)
- [ ] MFA ekran (TOTP je uključen u `supabase/config.toml`; isplata otkupa već traži `aal2`)

## Otvorena pitanja
- ~~Da li jedan korisnik može da bude u više firmi?~~ Da, `memberships` to podržava.
- Poziv novog korisnika šalje magic link. Da li je dovoljan Supabase-ov email ili treba naš (SMTP)? Za staging je dovoljan Supabase-ov.

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Uroš | Šema, RLS, pozivi, Vault ključ, audit log i seed (grana `feat/M0-temelj`). Ostaju ekrani |

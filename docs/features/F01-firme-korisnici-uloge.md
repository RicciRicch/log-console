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
- [ ] Migracije za tabele i RLS politike
- [ ] RLS testovi izolacije
- [ ] Funkcija `set_courier_secret` + SQL test (operater i druga firma dobijaju grešku)
- [ ] Login ekran i izbor firme (ako je korisnik u više firmi)
- [ ] Ekran "Korisnici" (poziv, uloga, deaktivacija)
- [ ] Ekran "Kuriri" (unos/zamena API ključa)
- [ ] Seed: 2 firme, po admin i operater

## Otvorena pitanja
- Da li jedan korisnik može da bude u više firmi? (fulfillment centri: verovatno da)

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

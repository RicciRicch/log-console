# Odluke (ADR)

Status: **Predlog** (čeka potvrdu tima), **Prihvaćeno**, **Zamenjeno**.

Format: kontekst → odluka → posledice. Nova odluka ide na dno sa sledećim brojem.

---

## ADR-001: Web-first, desktop (Tauri) kasnije
**Status:** Prihvaćeno
**Kontekst:** Prvobitna ideja je bila desktop aplikacija. Workflow je multi-tenant SaaS (više firmi, pod-klijenti, stranica za kupca), pa svi podaci i logika moraju da budu na serveru.
**Odluka:** Pravi se web aplikacija. Tauri omotač se dodaje kasnije ako zatreba (npr. direktna štampa nalepnica na termalni štampač).
**Posledice:** Nema instalacije za korisnike. Isti kod kasnije radi i u Tauri-ju.

## ADR-002: Supabase (Postgres) + RLS za odvajanje firmi
**Status:** Prihvaćeno
**Odluka:** Jedna baza, `tenant_id` u svakoj tabeli, Row Level Security preko `memberships`.
**Posledice:** Jednostavno za održavanje. Svaka nova tabela mora da ima RLS i test izolacije.

## ADR-003: TypeScript monorepo (pnpm)
**Status:** Prihvaćeno
**Odluka:** Web, worker i kurirski moduli u jednom repou, jedan jezik, zajednički tipovi.
**Posledice:** Lakše za tim od troje. Ako worker kasnije zatreba više performansi, može da se prepiše zasebno.

## ADR-004: Pozadinski poslovi preko pg-boss
**Status:** Prihvaćeno
**Odluka:** Redovi poslova u istom Postgresu (pg-boss), bez dodatnog Redisa za MVP.
**Posledice:** Manje infrastrukture. Redis/RabbitMQ tek ako opterećenje to traži.

## ADR-005: Polling statusa u MVP-u, webhook kasnije
**Status:** Prihvaćeno
**Odluka:** Worker na svakih sat vremena proverava sve pošiljke koje nisu završene.
**Posledice:** Status kasni najviše oko sat vremena. Paziti na limite kurirskog API-ja.

## ADR-006: BEX uplate otkupa preko uvoza fajla
**Status:** Prihvaćeno
**Kontekst:** Javni BEX API trenutno nema izveštaj o uplatama otkupa.
**Odluka:** Izveštaj se uvozi kao fajl sa portala. Sparivanje je isto kao da je došao sa API-ja.
**Posledice:** Jedan ručni korak dnevno dok BEX ne ponudi API.

## ADR-007: Next.js za web
**Status:** Prihvaćeno (dopunjuje ADR-001)
**Kontekst:** Tim želi Next.js. Tauri ne pokreće Next.js server, nego samo statičke fajlove.
**Odluka:** Web je Next.js (App Router) na Vercel-u. Kad dođe Tauri, desktop aplikacija otvara hostovanu web adresu (ne pravi se statički export), a Tauri dodaje samo ono što web ne može (npr. direktna štampa nalepnica).
**Posledice:** Slobodno se koriste Server Components, Server Actions i Route Handlers. Jedan kod za web i desktop. Desktop traži internet, što je ionako potrebno jer su podaci na serveru.

## ADR-008: Unos kurirskog API ključa preko `SECURITY DEFINER` funkcije
**Status:** Prihvaćeno
**Kontekst:** Administrator unosi API ključ kurira u web aplikaciji (F01), a ključ mora da završi u Supabase Vault-u. `service_role` ključ ne sme u `apps/web`, a običan korisnik nema pravo da piše u Vault.
**Odluka:** U bazi postoji funkcija `set_courier_secret(tenant_id, courier_code, secret)` (`SECURITY DEFINER`, `search_path` zaključan). Funkcija proverava da je pozivalac `admin` te firme, upisuje ili menja tajnu u Vault-u, u `courier_accounts` čuva `vault_secret_id` i `secret_last4`, i piše u `audit_log`. Web je poziva iz Server Action-a sa sesijom korisnika. Čitanje dešifrovane tajne ostaje samo worker-u (`service_role`). Ne postoji funkcija koja vraća ključ u web.
**Posledice:** Web nikad ne vidi ceo ključ posle unosa, prikaz `••••1234` ide iz `secret_last4`. Funkcija mora da ima SQL test: operater i korisnik druge firme dobijaju grešku. `EXECUTE` dozvola samo za `authenticated`, ne za `anon`.

## ADR-009: Trenutni status pošiljke je poslednji događaj po vremenu
**Status:** Prihvaćeno (Uroš, Velja, 08.11.2026.)
**Kontekst:** Na stvarnim BEX podacima kurir je upisivao "Dostavljeno", pa ga posle nekoliko minuta ispravljao u neuspelu dostavu, a poništavao je i "Vratiti pošiljaocu" (F03). Ako bi se status računao kao "najdalji dostignuti" ili se ne bi menjao posle `delivered`, konzola bi prikazivala pogrešan status.
**Odluka:** `shipments.status` je uvek jedinstveni status poslednjeg događaja po vremenu kod kurira (`occurred_at`). Kad dva događaja imaju isto vreme, odlučuje redosled u odgovoru kurira. Status može da ide i "unazad" (npr. `delivered` → `failed_delivery`).
**Posledice:** Logika ne pretpostavlja da statusi samo napreduju. UI, upozorenja (F05) i Google Sheet (F08) moraju da podnesu povratak statusa. Kada pošiljka postaje konačna (`is_final`) je posebno pitanje, otvoreno u F04.

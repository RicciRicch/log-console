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
**Status:** Predlog
**Odluka:** Jedna baza, `tenant_id` u svakoj tabeli, Row Level Security preko `memberships`.
**Posledice:** Jednostavno za održavanje. Svaka nova tabela mora da ima RLS i test izolacije.

## ADR-003: TypeScript monorepo (pnpm)
**Status:** Predlog
**Odluka:** Web, worker i kurirski moduli u jednom repou, jedan jezik, zajednički tipovi.
**Posledice:** Lakše za tim od troje. Ako worker kasnije zatreba više performansi, može da se prepiše zasebno.

## ADR-004: Pozadinski poslovi preko pg-boss
**Status:** Predlog
**Odluka:** Redovi poslova u istom Postgresu (pg-boss), bez dodatnog Redisa za MVP.
**Posledice:** Manje infrastrukture. Redis/RabbitMQ tek ako opterećenje to traži.

## ADR-005: Polling statusa u MVP-u, webhook kasnije
**Status:** Predlog
**Odluka:** Worker na svakih sat vremena proverava sve pošiljke koje nisu završene.
**Posledice:** Status kasni najviše oko sat vremena. Paziti na limite kurirskog API-ja.

## ADR-006: BEX uplate otkupa preko uvoza fajla
**Status:** Predlog
**Kontekst:** Javni BEX API trenutno nema izveštaj o uplatama otkupa.
**Odluka:** Izveštaj se uvozi kao fajl sa portala. Sparivanje je isto kao da je došao sa API-ja.
**Posledice:** Jedan ručni korak dnevno dok BEX ne ponudi API.

## ADR-007: Next.js za web, Tauri kasnije
**Status:** Prihvaćeno
**Kontekst:** Tim želi Next.js. Tauri ne pokreće Next.js server, nego samo statičke fajlove.
**Odluka:** Web je Next.js (App Router) na Vercel-u. Kad dođe Tauri, desktop aplikacija otvara hostovanu web adresu (ne pravi se statički export), a Tauri dodaje samo ono što web ne može (npr. direktna štampa nalepnica).
**Posledice:** Slobodno se koriste Server Components, Server Actions i Route Handlers. Jedan kod za web i desktop. Desktop traži internet, što je ionako potrebno jer su podaci na serveru.

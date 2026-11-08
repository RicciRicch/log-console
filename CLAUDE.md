# CLAUDE.md

Uputstvo za Claude Code u ovom repou. Kratko i obavezujuće.

## Proizvod

Multi-tenant SaaS za praćenje pošiljki i otkupa preko više kurira (prvi kurir: BEX). Više firmi koristi isti sistem, a svaka vidi samo svoje podatke. Detalji: `docs/MVP.md`, `docs/ARCHITECTURE.md`.

## Stack

- Monorepo, pnpm workspaces, TypeScript svuda
- `apps/web`: Next.js (App Router) + TypeScript, Tailwind. Web-first, Tauri kasnije (vidi ADR-007)
- `apps/worker`: Node + TypeScript, poslovi preko pg-boss (polling statusa, uvoz, sparivanje uplata)
- `packages/couriers`: kurirski moduli (BEX, ...), jedan zajednički interfejs
- `packages/shared`: zajednički tipovi, statusi, validacija (zod)
- `supabase/`: migracije, RLS politike, seed

## Komande

> Popuniti kad se postavi repo (F00).

```
pnpm install
pnpm dev          # web + worker
pnpm test
pnpm lint
supabase start    # lokalna baza
supabase db reset # migracije + seed
```

## Pravila koja se ne krše

1. **Svaka tabela sa podacima firme ima `tenant_id` i RLS politiku.** Nova tabela bez RLS-a = greška. Napiši i test da firma A ne vidi podatke firme B.
2. **Jezgro ne zna za kurire.** Sve što je specifično za kurira je u `packages/couriers/<kurir>`. Jezgro koristi samo interfejs `CourierAdapter` i jedinstvene statuse iz `packages/shared`.
3. **Tajne nikad ne idu u frontend.** API ključevi kurira se čuvaju šifrovano (Supabase Vault) i koriste samo u worker-u. `service_role` ključ nikad u `apps/web`.
4. **Idempotentnost.** Svaki posao koji se može ponoviti (uvoz, kreiranje pošiljki, sparivanje uplata) mora da bude bezbedan za ponovno pokretanje, bez duplikata.
5. **Greška jednog reda ne ruši ceo batch.** Loš red ide u listu sa razlogom, ostali idu dalje.
6. **Kod i nazivi u kodu na engleskom, UI tekst na srpskom (latinica).**
7. **Next.js:** pristup bazi i tajnama samo u Server Components, Server Actions i Route Handlers. Fajl sa tajnama počinje sa `import 'server-only'`. Klijentske komponente ne uvoze serverski kod.
8. **Git:** pravila su u `CONTRIBUTING.md`. Nikad ne dodaj `Co-Authored-By`, "Generated with Claude" ili bilo kakvu Claude atribuciju u commit poruke i PR opise.
9. **PR samo kad je faza skroz gotova.** Ne otvaraj PR za svaku granu, sitnicu ili predlog. Radi na jednoj grani po fazi (npr. `feat/M0-temelj`), commit-uj i push-uj koliko treba (CI radi na svakom push-u), a PR otvori tek kad je ceo deo faze gotov i proveren. Predlozi i pitanja za tim idu u razgovor, ne kao PR.

## Kako radiš na zadatku

1. Pročitaj feature fajl iz `docs/features/` koji ti je dat. Ako ne postoji, pitaj.
2. Napravi plan i čekaj potvrdu pre većih izmena.
3. Drži se obima iz feature fajla. Ako nešto nedostaje, upiši u "Otvorena pitanja", ne izmišljaj.
4. Na kraju: štikliraj završene zadatke u feature fajlu, dopiši red u "Dnevnik" i ažuriraj status u `docs/features/README.md`.
5. Ako je doneta nova arhitektonska odluka, dodaj je u `docs/DECISIONS.md`.

## UI i dizajn

- Pre bilo kakvog UI rada pročitaj `PRODUCT.md` i `DESIGN.md` i koristi Impeccable skill.
- Boje statusa su fiksne i semantičke (vidi `PRODUCT.md`). Ne menjaj ih bez odluke tima.

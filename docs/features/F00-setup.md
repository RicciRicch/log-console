# F00: Setup repoa, baze i deploy-a

**Status:** U radu · **Vlasnik:** Uroš · **Faza:** M0 · **Zavisi od:** —

## Cilj
Prazan, ali ispravan projekat na kom sva trojica mogu odmah da rade, sa lokalnom bazom i automatskim deploy-em.

## Obim
**Ulazi:** monorepo, lint/format, testovi, lokalni Supabase, CI, staging deploy.
**Ne ulazi:** produkcioni domen, monitoring (kasnije).

## Kriterijumi prihvatanja
- [x] `pnpm install && pnpm dev` diže web i worker kod svakog člana tima
- [x] `supabase db reset` pravi bazu sa seed podacima (2 test firme) — proverava CI na svakom push-u
- [x] CI pokreće lint, typecheck i testove na svakom PR-u (i na svakom push-u)
- [ ] Merge u `main` deploy-uje web i worker na staging (čeka Vercel i Railway naloge)
- [x] `main` je zaštićen (PR + 1 odobrenje)

## Zadaci
- [x] GitHub repo, zaštita `main` grane, `CODEOWNERS` i PR šablon (vidi `CONTRIBUTING.md`)
- [x] Next.js app u `apps/web` (App Router, Tailwind, `@supabase/ssr`, `proxy.ts` osvežava sesiju)
- [x] pnpm workspaces: `apps/web`, `apps/worker`, `packages/shared`, `packages/couriers`
- [x] TypeScript, ESLint, Prettier, Vitest
- [x] Supabase projekat `konzola-staging` (Frankfurt) + `supabase init`; migracije primenjene na staging
- [x] `.env.example` za web i worker (bez tajni u repou)
- [x] GitHub Actions: lint, format, typecheck, test, baza (migracije + pgTAP + `db lint`)
- [x] Worker u `apps/worker`: pg-boss, probni posao `health`, uredno gašenje
- [ ] Deploy: web (Vercel, preview deploy za svaki PR), worker (Railway)
- [x] Popuniti sekciju "Komande" u `CLAUDE.md`

## Otvorena pitanja
- ~~Railway ili Fly.io za worker?~~ Railway (jednostavniji za tim bez DevOps iskustva). Nalog još nije napravljen.
- Uroš lokalno ne koristi Docker: testovi baze se proveravaju u CI-ju, a ručne provere na staging bazi.

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Uroš | Osnova monorepa: pnpm workspaces, `tsconfig.base.json`, Vitest (prvi deo F00, da Velja može da radi u `packages/`) |
| 08.11.2026. | Uroš | Lint, Supabase, CI, Next.js web, worker sa pg-boss-om, seed; sve na grani `feat/M0-temelj`. Ostaje deploy |

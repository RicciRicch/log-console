# F00: Setup repoa, baze i deploy-a

**Status:** Spec · **Vlasnik:** Uroš · **Faza:** M0 · **Zavisi od:** —

## Cilj
Prazan, ali ispravan projekat na kom sva trojica mogu odmah da rade, sa lokalnom bazom i automatskim deploy-em.

## Obim
**Ulazi:** monorepo, lint/format, testovi, lokalni Supabase, CI, staging deploy.
**Ne ulazi:** produkcioni domen, monitoring (kasnije).

## Kriterijumi prihvatanja
- [ ] `pnpm install && pnpm dev` diže web i worker kod svakog člana tima
- [ ] `supabase db reset` pravi bazu sa seed podacima (2 test firme)
- [ ] CI pokreće lint, typecheck i testove na svakom PR-u
- [ ] Merge u `main` deploy-uje web i worker na staging
- [ ] `main` je zaštićen (PR + 1 odobrenje)

## Zadaci
- [ ] GitHub repo, zaštita `main` grane, `CODEOWNERS` i PR šablon (vidi `CONTRIBUTING.md`)
- [ ] Next.js app u `apps/web` (App Router, Tailwind, `@supabase/ssr`)
- [ ] pnpm workspaces: `apps/web`, `apps/worker`, `packages/shared`, `packages/couriers`
- [ ] TypeScript, ESLint, Prettier, Vitest
- [ ] Supabase projekat (EU region) + lokalni `supabase init`
- [ ] `.env.example` za web i worker (bez tajni u repou)
- [ ] GitHub Actions: lint, typecheck, test
- [ ] Deploy: web (Vercel, preview deploy za svaki PR), worker (Railway/Fly.io)
- [ ] Popuniti sekciju "Komande" u `CLAUDE.md`

## Otvorena pitanja
- Railway ili Fly.io za worker?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

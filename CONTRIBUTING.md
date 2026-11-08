# Pravila za GitHub

Važi za Uroša, Velju i Duleta. Cilj: `main` je uvek ispravan i niko nikome ne gazi kod.

## 1. Grane

- `main`: uvek radi i deploy-uje se. **Zaštićena**: nema direktnog push-a ni force push-a.
- Sve ostalo ide u kratke grane iz `main`-a. Naziv grane:

| Vrsta | Primer |
| --- | --- |
| Novi feature | `feat/F03-bex-modul` |
| Ispravka | `fix/F04-dupli-dogadjaji` |
| Sređivanje bez promene ponašanja | `refactor/F06-status-badge` |
| Dokumentacija | `docs/mvp-dopuna` |
| Alati, CI, zavisnosti | `chore/ci-cache` |

- Grana živi najviše nekoliko dana. Veći feature se deli na više PR-ova.
- Pre otvaranja PR-a uradi `git pull --rebase origin main` da grana bude ažurna.

## 2. Commit poruke

Format ([Conventional Commits](https://www.conventionalcommits.org)):

```
tip(oblast): kratak opis u sadašnjem vremenu
```

Primeri:
```
feat(bex): mapiranje BEX statusa u jedinstvene statuse
fix(import): duplikati pri ponovnom uvozu istog fajla
docs(F02): dopunjeni kriterijumi prihvatanja
```

- Tipovi: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- Oblast: `web`, `worker`, `bex`, `db`, `import`, `cod`, `ui`, ili broj feature-a.
- **Bez `Co-Authored-By: Claude` i bez "Generated with Claude"** u commit-ovima i PR-ovima. Autor je onaj ko commit-uje.

## 3. Pull request

- **PR se otvara tek kad je faza (ili tvoj deo faze) skroz gotova i proverena.** Do tada se radi na jednoj grani, sa onoliko commit-ova koliko treba. CI radi na svakom push-u, pa se greške vide i bez PR-a.
- Predlozi, pitanja i sitnice ne idu kao poseban PR, nego na sync ili u poruku.
- Naslov kao commit poruka: `feat(bex): praćenje statusa`.
- Opis po šablonu (popunjava se sam iz `.github/pull_request_template.md`).
- Ako PR još nije spreman, otvori ga kao **Draft**.
- Merge: **Squash and merge**, pa je jedan PR = jedan commit u `main`-u. Grana se briše posle merge-a.

## 4. Review

- Svaki PR odobrava **bar jedan drugi** član tima. Svoj PR ne odobravaš sam.
- `CODEOWNERS` automatski dodaje vlasnika dela koji menjaš:
  - baza i migracije → Uroš
  - worker i kurirski moduli → Velja
  - web i dizajn → Dule
- Review u roku od **24h**. Ako ne stigneš, napiši to u PR-u.
- Komentar sa prefiksom `nit:` je sitnica i ne blokira merge.
- Proverava se:
  - da li rešava ono što piše u feature fajlu,
  - da li nova tabela ima RLS i test,
  - da li ima tajni u kodu,
  - da li prolaze testovi i CI.

## 5. Šta se nikad ne commit-uje

- `.env` fajlovi i bilo kakvi ključevi (BEX, Supabase `service_role`, Google). U repou je samo `.env.example`.
- Pravi podaci kupaca (imena, telefoni, adrese). Za testove samo izmišljeni podaci.
- `node_modules`, build fajlovi.

Ako tajna slučajno ode na GitHub: odmah je **promeni (rotiraj)** kod servisa, pa tek onda čisti istoriju.

## 6. Migracije baze

- Migracije pravi i menja samo onaj ko radi na PR-u, a vlasnik (Uroš) mora da odobri.
- Migracija koja je već u `main`-u se **nikad ne menja**. Ispravka ide kao nova migracija.
- Dva PR-a sa migracijama istovremeno: drugi se rebase-uje i preimenuje svoju migraciju da bude poslednja.

## 7. Ko je šta uradio

Ne vodi se poseban fajl po osobi. Sve se već vidi na tri mesta:

- **GitHub istorija:** commit-ovi i PR-ovi po autoru (`Insights → Contributors`, filter PR-ova `author:ime`).
- **Tabla:** `docs/features/README.md` (vlasnik i status svakog feature-a).
- **Dnevnik u feature fajlu:** datum, ko, šta, kad se završi nešto bitno.

## 8. Kad nešto pukne u `main`-u

1. Onaj ko primeti javlja ostalima.
2. Ko je merge-ovao poslednji PR, pravi `revert` PR odmah, a ispravku tek posle.
3. Ne gura se ispravka preko pokvarenog `main`-a.

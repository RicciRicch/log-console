# Način rada

## Git

Sva pravila za GitHub su u [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Životni ciklus feature-a

`Ideja → Spec → U radu → Review → Gotovo`

1. **Spec:** vlasnik popuni feature fajl (cilj, obim, kriterijumi). Drugi član pročita.
2. **U radu:** grana, kod, štikliranje zadataka u fajlu.
3. **Review:** PR, testovi prolaze, provera kriterijuma prihvatanja.
4. **Gotovo:** merge, status na tabli, red u "Dnevnik".

## Rad sa Claude Code-om

Početak sesije (kopiraj i prilagodi):

```
Pročitaj CLAUDE.md i docs/features/F03-bex-modul.md.
Radimo na zadacima iz sekcije "Zadaci". Prvo napravi plan, ne menjaj kod dok ne potvrdim.
```

Saveti:
- Jedna sesija = jedan feature. Za novi feature, nova sesija (`/clear`).
- Za veće stvari koristi plan mode (Shift+Tab) pre pisanja koda.
- Kraj sesije: "Ažuriraj feature fajl i tablu."
- Ako Claude predloži arhitektonsku promenu, prvo u `DECISIONS.md`, pa tek onda kod.

## Dizajn sa Impeccable-om

Instalacija (jednom, u root-u repoa):

```
npx skills add pbakaus/impeccable
```

Tok:
1. `/impeccable init`: čita `PRODUCT.md`, postavlja pitanja i pravi `DESIGN.md`. Radi osoba C, a ostali pregledaju rezultat.
2. Pre svakog novog ekrana: `/impeccable shape` (plan UX-a pre koda).
3. Posle ekrana: `/impeccable audit` i `/impeccable polish`.
4. `DESIGN.md` se commit-uje i menja samo kroz PR.

Tačne nazive komandi proverite posle instalacije (`/impeccable` bez argumenata), jer se menjaju između verzija.

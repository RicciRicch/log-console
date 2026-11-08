# Tim i podela posla

Svako ima svoj deo sistema i "vlasnik" je tih feature-a: piše kod, odlučuje o detaljima i pazi da radi. Review uvek radi neko drugi.

## Uloge

| Uloga | Ime | Deo sistema | Features |
| --- | --- | --- | --- |
| **A: Jezgro i baza** | Uroš | Supabase šema, migracije, RLS, auth, uloge, otkupi, deploy | F00, F01, F07 |
| **B: Integracije i worker** | Velja | Kurirski moduli, worker, polling, upozorenja, Google Sheets | F03, F04, F05, F08 |
| **C: Frontend i dizajn** | Dule | Impeccable, svi ekrani, UX uvoza | F02 (UI + parsiranje), F06, UI za F05 i F07 |

Predlog: brat koji radi u logistici je i **vlasnik proizvoda**. On odlučuje šta je važnije kad nije jasno, testira sa stvarnim podacima i piše "Kriterijume prihvatanja" u feature fajlovima. Najbolje mu odgovara uloga C ili A, jer tu je najviše odluka o tome kako operater radi.

## Ugovori između delova

Da niko ne čeka drugog, ovo se dogovori prvo i menja samo uz dogovor sve trojice:

| Ugovor | Gde živi | Vlasnik |
| --- | --- | --- |
| Šema baze | `supabase/migrations` | A |
| Jedinstveni statusi i tipovi | `packages/shared` | B |
| `CourierAdapter` interfejs | `packages/couriers/core` | B |
| Design tokeni i komponente | `DESIGN.md`, `apps/web/src/ui` | C |

Dok A ne završi šemu, C radi UI sa mock podacima iz `packages/shared`, a B radi BEX modul sa test pošiljkama.

## Redosled na početku

```
Nedelja 1:  A → F00 setup + početak F01
            B → BEX API istraživanje, CourierAdapter, F03 nacrt
            C → /impeccable init, DESIGN.md, ekran liste na mock podacima
Nedelja 2+: svako po svojim feature-ima iz M1
```

## Ritam

- **Kratak sync 2x nedeljno** (15 min): šta je gotovo, šta blokira.
- **Tabla:** `docs/features/README.md`. Ažurira je onaj ko menja status.
- **Odluke:** sve što utiče na drugu osobu ide u `docs/DECISIONS.md`.

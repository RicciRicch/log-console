# Tabla feature-a

Statusi: `Ideja` · `Spec` · `U radu` · `Review` · `Gotovo`

| # | Feature | Faza | Vlasnik | Status | Zavisi od |
| --- | --- | --- | --- | --- | --- |
| [F00](./F00-setup.md) | Setup repoa, baze i deploy-a | M0 | Uroš | U radu | — |
| [F01](./F01-firme-korisnici-uloge.md) | Firme, korisnici i uloge | M0 | Uroš | Spec | F00 |
| [F02](./F02-uvoz-i-mapiranje.md) | Uvoz pošiljki i mapiranje kolona | M1 | Dule | Spec | F01 |
| [F03](./F03-bex-modul.md) | BEX modul | M1 | Velja | Review | F00 |
| [F04](./F04-pracenje-statusa.md) | Automatsko praćenje statusa | M1 | Velja | Spec | F02, F03 |
| [F05](./F05-upozorenja.md) | Upozorenja | M1 | Velja (+Dule za UI) | Spec | F04 |
| [F06](./F06-lista-posiljki-ui.md) | Lista i detalj pošiljke | M1 | Dule | U radu | F01 |
| [F07](./F07-otkupi-i-uplate.md) | Otkupi i uplate | M2 | Uroš (+Dule za UI) | Ideja | F04 |
| [F08](./F08-google-sheet-izlaz.md) | Upis statusa u Google Sheet | M3 | Velja | Ideja | F04 |
| [F09](./F09-klijentska-strana.md) | Klijentska strana (predlog ADR-010) | M1? | Dule (UI) + Uroš (baza) | Ideja | F01, F06 |

Novi feature: kopiraj `_TEMPLATE.md`, daj mu sledeći broj i dodaj red ovde.

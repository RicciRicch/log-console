# MVP

## Cilj

Firma prestaje da prati pošiljke i otkupe ručno po BEX portalu i Google Sheet-u. Sve vidi u konzoli, a statusi se ažuriraju sami.

**Prvi korisnik (pilot):** firma u kojoj brat radi, sa stvarnim BEX pošiljkama.

## Šta ulazi u MVP

| # | Feature | Fajl |
| --- | --- | --- |
| F00 | Setup repoa, baze i deploy-a | [F00](./features/F00-setup.md) |
| F01 | Firme, korisnici i uloge | [F01](./features/F01-firme-korisnici-uloge.md) |
| F02 | Uvoz pošiljki (Excel/CSV/Google Sheet) i mapiranje kolona | [F02](./features/F02-uvoz-i-mapiranje.md) |
| F03 | BEX modul (praćenje statusa) | [F03](./features/F03-bex-modul.md) |
| F04 | Automatsko praćenje statusa i istorija | [F04](./features/F04-pracenje-statusa.md) |
| F05 | Upozorenja | [F05](./features/F05-upozorenja.md) |
| F06 | Lista i detalj pošiljke (UI) | [F06](./features/F06-lista-posiljki-ui.md) |
| F07 | Otkupi i uplate | [F07](./features/F07-otkupi-i-uplate.md) |
| F08 | Upis statusa nazad u Google Sheet | [F08](./features/F08-google-sheet-izlaz.md) |

## Šta NE ulazi u MVP (kasnije)

- Kreiranje pošiljki kod kurira i štampa nalepnica (u MVP-u se pošiljke kreiraju kao i do sada, a konzola ih uvozi i prati)
- Drugi kurir
- Pod-klijenti za fulfillment centre
- Direktna veza sa web shopom
- Javna stranica za praćenje za krajnjeg kupca
- Desktop aplikacija (Tauri)
- Webhook-ovi od kurira (u MVP-u je polling)

## Faze

| Faza | Šta je gotovo | Features |
| --- | --- | --- |
| M0: Temelj | Repo, baza, login, firma sa korisnicima | F00, F01 |
| M1: Praćenje | Uvoz pošiljki, statusi se sami ažuriraju, lista sa bojama i upozorenjima | F02–F06 |
| M2: Novac | Otkupi, sparivanje uplata, specifikacija za klijenta | F07 |
| M3: Pilot | Google Sheet sinhronizacija, rad sa stvarnim podacima | F08 + ispravke |

## Kako znamo da MVP radi

- Operater uveze dnevni spisak pošiljki za manje od 2 minuta.
- Status svake aktivne pošiljke nije stariji od sat vremena.
- Zaglavljene i neuspele pošiljke se vide bez ručnog traženja.
- Dnevno sparivanje uplata otkupa traje minute, ne sate.
- Firma A nikad ne vidi podatke firme B (pokriveno testovima).
- Pilot firma koristi konzolu 2 nedelje umesto tabele.

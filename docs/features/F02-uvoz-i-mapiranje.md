# F02: Uvoz pošiljki i mapiranje kolona

**Status:** Spec · **Vlasnik:** Dule · **Faza:** M1 · **Zavisi od:** F01

## Cilj
Operater ubaci postojeći spisak pošiljki (Excel, CSV ili Google Sheet) i konzola od tada sama prati te pošiljke. Ovo menja ručno prepisivanje kodova.

## Korisnička priča
Kao operater, želim da ubacim današnji spisak BEX pošiljki iz tabele koju već koristim, da ne bih morao da prepisujem brojeve.

## Obim
**Ulazi:** upload `.xlsx` i `.csv`, povezivanje Google Sheet-a, mapiranje kolona (pamti se po firmi), provera redova, liste "Spremno" i "Za ispravku", ponovni uvoz bez duplikata.
**Ne ulazi:** kreiranje pošiljki kod kurira, provera adrese kroz šifarnik kurira (to je za fazu sa kreiranjem pošiljki).

## Kriterijumi prihvatanja
- [ ] Pri prvom uvozu korisnik poveže kolone (broj pošiljke, primalac, telefon, mesto, otkup, napomena), a sledeći put se mapa primenjuje sama
- [ ] Red bez broja pošiljke ili sa lošim iznosom otkupa ide u "Za ispravku" sa razlogom
- [ ] Isti fajl uvezen dva puta ne pravi duplikate
- [ ] Uvoz 1.000 redova traje manje od 30 sekundi
- [ ] Greška u jednom redu ne zaustavlja ostale

## Tehničke beleške
- Tabele: `import_mappings`, `imports`, `shipments`
- Parsiranje: SheetJS na klijentu za pregled, a konačni upis radi worker posao `process-import`
- Google Sheet: OAuth po firmi ili service account (odlučiti)

## Zadaci
- [ ] Zod šema reda u `packages/shared`
- [ ] Ekran: upload + pregled prvih redova
- [ ] Ekran: mapiranje kolona
- [ ] Ekran: rezultat (Spremno / Za ispravku, ispravka u tabeli)
- [ ] Worker posao `process-import` (upsert po `tenant_id, courier_code, tracking_number`)
- [ ] Google Sheet izvor

## Otvorena pitanja
- Kako tačno izgleda sadašnja tabela u pilot firmi? Treba nam primer fajla (bez pravih ličnih podataka).
- Google Sheet: OAuth ili deljenje sa service account emailom?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

# F08: Upis statusa u Google Sheet

**Status:** Ideja · **Vlasnik:** Velja · **Faza:** M3 · **Zavisi od:** F04

## Cilj
Firma koja i dalje koristi svoju Google tabelu dobija statuse i boje redova automatski, bez ručnog unosa. Tako je prelazak na konzolu postepen.

## Obim
**Ulazi:** povezivanje tabele, izbor kolone za status, upis statusa i boje reda posle promene.
**Ne ulazi:** dvosmerna sinhronizacija svih polja.

## Kriterijumi prihvatanja
- [ ] Posle promene statusa red u Sheet-u se ažurira u roku od nekoliko minuta
- [ ] Boja reda prati boje statusa iz `PRODUCT.md`
- [ ] Poštuju se limiti Google Sheets API-ja (batch upisi)
- [ ] Ako je tabela obrisana ili pristup povučen, upozorenje u konzoli, bez pada posla

## Tehničke beleške
- Tabela `sheet_connections` (tabela, list, kolona sa brojem pošiljke, kolona za status, način pristupa, poslednja greška). Ako F02 koristi isti Sheet kao izvor, deli istu vezu.

## Zadaci
- [ ] Odluka OAuth ili service account (zajedno sa F02)
- [ ] Tabela `sheet_connections` + RLS
- [ ] Posao `sync-google-sheet` sa batch upisom
- [ ] Podešavanje u UI: tabela, list, kolona za status

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

# F06: Lista i detalj pošiljke

**Status:** Spec · **Vlasnik:** Dule · **Faza:** M1 · **Zavisi od:** F01 (može da počne na mock podacima)

## Cilj
Glavni ekran konzole: sve pošiljke svih kurira na jednom mestu, sa istim statusima i bojama.

## Korisnička priča
Kao operater, želim da otvorim jedan ekran i odmah vidim gde je koja pošiljka, umesto da proveravam BEX portal.

## Obim
**Ulazi:** tabela pošiljki, filteri (status, kurir, datum, ima otkup), pretraga (broj pošiljke, primalac, telefon), sortiranje, paginacija na serveru, detalj sa istorijom, izvoz filtrirane liste u Excel.
**Ne ulazi:** izmena pošiljke, batch akcije prema kuriru.

## Kriterijumi prihvatanja
- [ ] Lista sa 10.000+ pošiljki se učitava i filtrira za manje od 1 sekunde
- [ ] Status ima boju, tekst i ikonicu (boje iz `PRODUCT.md`)
- [ ] Filteri ostaju u URL-u (može da se pošalje link)
- [ ] Detalj prikazuje celu istoriju statusa sa vremenom
- [ ] Prošao `/impeccable audit` bez kritičnih nalaza

## Zadaci
- [ ] `/impeccable init` → `DESIGN.md` (pregledaju sva trojica)
- [ ] `/impeccable shape` za listu i detalj
- [ ] Osnovne UI komponente (StatusBadge, tabela, filteri)
- [ ] Ekran liste (TanStack Table, podaci kroz Server Components, filteri u URL-u)
- [ ] Ekran detalja (vremenska linija)
- [ ] Izvoz u Excel
- [ ] `/impeccable audit` i `/impeccable polish`

## Otvorena pitanja
- Koje kolone operater stvarno gleda svaki dan? (pitati pilot firmu)

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

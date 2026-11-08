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
- [x] `/impeccable init` (PRODUCT.md); `DESIGN.md` nastaje posle prvog ekrana (pregledaju sva trojica)
- [x] `/impeccable shape` za listu i detalj
- [ ] Osnovne UI komponente (StatusBadge, tabela, filteri)
- [ ] Ekran liste (TanStack Table, podaci kroz Server Components, filteri u URL-u)
- [ ] Ekran detalja (vremenska linija)
- [ ] Izvoz u Excel
- [ ] `/impeccable audit` i `/impeccable polish`

## Dizajn brief (`/impeccable shape`)

**Posao i korisnik.** Operater ceo dan za desktop računarom. Danas filtrira Google Sheet po boji iz legende ("neisporučeno"), proverava kod po kod na BEX portalu i ručno menja boju reda. Konzola boji sama, a ekran služi tom obilasku: vidi otvorene pošiljke po statusu, uoči šta je zapelo i prođe ih jednu po jednu. Mod: Operate.

**Pravac: Linija rute, uprošćen.** Znak SV je linija rute sa čvorom na krajevima, a put pošiljke je ta ista linija sa stanicama. Izabrano od 5 skica (`.impeccable/mocks/decision/`). Konačne skice: `.impeccable/mocks/linija-rute-operater.html` i `.impeccable/mocks/linija-rute-klijent.html`. Vlasnik je tražio manje detalja i da ne bude zbunjujuće, zato:
- **Linija rute samo u detalju.** Istorija pošiljke je vertikalna linija; svaki događaj je stanica, trenutna je naglašena, neuspeli pokušaj ima žutu stanicu sa "!". Pošto status može da ide unazad (ADR-009), linija prati događaje po vremenu, a ne fiksne faze.
- **U tabeli nema male rute po redu.** Status je oznaka: kružni čvor u boji statusa + ikonica + tekst.
- **Navigacija je obična lista**, bez stanica i linija.
- **Ljuska:** tamnoljubičasta leva traka (boja logoa) sa navigacijom i logom, svetla radna površina. Ljubičasta je za brend, izbor i fokus, nikad za status.

**Raspored.** Levo navigacija (Pošiljke, Upozorenja sa brojem, Uvoz, Otkupi, Podešavanja). Iznad tabele: pretraga (broj pošiljke, primalac, telefon), čipovi statusa sa brojevima, filteri Kurir, Datum, Ima otkup, dugme "Izvezi u Excel", oznaka "Ažurirano pre N min". Tabela, a desno panel detalja; lista ostaje vidljiva, ↑ ↓ prelazi na sledeću pošiljku.

**Kolone** (potvrdio vlasnik): Broj pošiljke + kurir · Status · Primalac (telefon ispod imena) · Mesto · Otkup · Poslednja promena (vreme + opis događaja, npr. razlog neuspele dostave).

**Stanja.** Zaglavljeno (oznaka "Zaglavljeno N d"), druga neuspela dostava ("Pozvati kupca" u detalju), završene (Isporučeno, Vraćeno) su prigušene, prazan rezultat filtera, učitavanje, sinhronizacija nije uspela. Raspon: desetine do 10.000+ pošiljki, gusta tabela.

**Granice.** Bez izmene pošiljke i batch akcija prema kuriru (van obima). Boje statusa iz `PRODUCT.md` se ne menjaju; status nikad samo bojom. WCAG 2.2 AA, rad samo tastaturom, tekst najmanje 11px.

**Klijentska strana** (F09, predlog ADR-010) deli isti vizuelni svet, ali mirniji: bez batch akcija i upozorenja, samo pregled.

**Gradi se u kodu** (Operate ekran). `DESIGN.md` nastaje posle prvog napravljenog ekrana.

## Otvorena pitanja
- Koje kolone operater stvarno gleda svaki dan? Vlasnik je potvrdio skup iznad; proveriti sa pilot firmom.

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Dule | `/impeccable init` (PRODUCT.md) i `/impeccable shape`: izabran pravac Linija rute, uprošćen |

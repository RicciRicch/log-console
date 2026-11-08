# Product

<!-- impeccable:product-schema 1 -->

Kontekst proizvoda za Impeccable. Ovde je samo istina o proizvodu; vizuelni sistem je u `DESIGN.md`.

## Platform

web

## Šta je proizvod

**ShipmentView** je alat za firme koje šalju pakete: jedno mesto za sve pošiljke, statuse i otkupe, za sve kurire. Zamenjuje rad po kurirskim portalima i Google Sheet tabelama.

## Ko ga koristi

- **Operater** (glavni korisnik): zaposleni u web shopu, magacinu ili fulfillment centru. Ceo dan radi u konzoli na desktop računaru, često sa velikim brojem pošiljki (desetine do hiljade dnevno). Hoće da brzo vidi šta je zapelo i da reaguje.
- **Administrator firme**: vlasnik ili šef. Gleda novac (otkupe), odobrava isplate, upravlja nalozima.
- **Pod-klijent** (kasnije): klijent fulfillment centra, samo pregled.

## Product Purpose

Cilj je da svaki klijent vidi informacije o svojim pošiljkama na jednom mestu, umesto da proverava statuse po kurirskim portalima. Uspeh: operater uveze dnevni spisak za manje od 2 minuta, status nije stariji od sat vremena, zaglavljene pošiljke se vide bez traženja, sparivanje uplata traje minute (vidi `docs/MVP.md`).

## Positioning

Ono što portal jednog kurira ili tabela ne mogu:

1. **Svi kuriri na jednom mestu**, sa jedinstvenim statusima bez obzira na kurira.
2. **Problem iskoči sam**: zaglavljene, neuspele i nepreuzete pošiljke se vide bez traženja.
3. **Novac pod kontrolom**: otkupi, sparivanje uplata, specifikacija za klijenta.
4. **Nema prepisivanja**: uvozi se postojeća tabela, a statusi se dalje prate sami.

## Operating Context

Kancelarija ili magacin, veliki monitor, miš i tastatura, ponekad laptop. Mobilni nije prioritet za MVP. Operater radi sa dugim listama celog dana; administrator dolazi povremeno zbog novca.

Postojeći alati koje zamenjujemo: kurirski portali (prvi kurir BEX), Google Sheet tabele, izveštaj o uplatama otkupa kao fajl sa BEX portala (ADR-006).

## Capabilities and Constraints

Glavni ekrani (MVP):

1. Lista pošiljki (filteri po statusu, kuriru, datumu; pretraga po broju pošiljke i primaocu)
2. Detalj pošiljke (istorija statusa)
3. Upozorenja (Zaglavljeno, Nije preuzeto, Neuspela dostava)
4. Uvoz (fajl ili Google Sheet, mapiranje kolona, pregled grešaka)
5. Otkupi i uplate (faze, sparivanje, specifikacija)
6. Podešavanja firme (korisnici, kurirski API ključevi)

Ograničenja: multi-tenant (firma vidi samo svoje podatke), status kasni do sat vremena (polling, ADR-005), van MVP-a su kreiranje pošiljki i štampa nalepnica (`docs/MVP.md`).

### Fiksne semantičke boje

Status pošiljke (isti za sve kurire):

| Status | Boja |
| --- | --- |
| Kreirano | Siva |
| U transportu | Plava |
| Neuspela dostava | Žuta |
| Isporučeno | Zelena |
| Povrat u toku | Narandžasta |
| Vraćeno | Crvena |

Faza otkupa: Čeka naplatu (bez boje), Naplaćeno kod kurira (siva), Kurir uplatio (žuta), Isplaćeno klijentu (zelena).

Tačne nijanse određuje `DESIGN.md`, ali značenje boja se ne menja.

### Jezik i formati

- UI na srpskom, latinica.
- Datum `08.11.2026.`, vreme `14:35`, novac `1.250,00 RSD`.
- Ton: kratko i jasno, bez žargona. "Za ispravku", ne "Validation failed".

## Brand Commitments

- Ime: **ShipmentView**. Postoji logo i dizajn se gradi na osnovu njega: znak "SV" kao jedna ljubičasta linija rute sa kružnim čvorom na oba kraja (početak i kraj puta pošiljke), ispod reč "ShipmentView" u crnom geometrijskom sans-u. Boja je jedna ravna ljubičasta, bez gradijenta.
- Fajlovi: `docs/brand/shipmentview-mark.svg` (znak, ručno precrtan iz PNG-a, približna boja `#4A0099`) i `docs/brand/shipmentview-logo.png` (original, kad se doda). Tačna boja se uzima iz originala.
- Ličnost: pouzdano, mirno, precizno. Kao dobar kontrolni panel: informacija je na prvom mestu, ukrasi ne postoje. Korisnik treba da oseti da ima kontrolu nad pošiljkama i novcem.
- Nije: razigrano, šareno, "startup" marketinški izgled, ljubičasti gradijenti, velike ilustracije.

## Evidence on Hand

- BEX odgovori i fixtures iz F03 (`docs/features/F03-bex-modul.md`).
- Nema primera tabele iz pilot firme (otvoreno pitanje u F02). Nema pravih podataka kupaca, testimonijala ni brojki; ne izmišljati ih.

## Product Principles

1. **Gustina pre dekoracije.** Tabele sa mnogo redova su glavni ekran. Čitljivost velikih lista je važnija od praznog prostora.
2. **Problem se vidi odmah.** Zaglavljene, neuspele i nepreuzete pošiljke moraju da iskoče bez traženja.
3. **Boja nikad nije jedini signal.** Status uvek ima i tekst (i ikonicu), zbog pristupačnosti i štampe.
4. **Akcije nad više redova odjednom** (selekcija, batch akcije) su prirodne, ne skrivene.
5. **Brojevi su poravnati i čitljivi** (tabular nums), novac uvek sa valutom.

## Accessibility & Inclusion

WCAG 2.2 AA: kontrast teksta i statusnih oznaka, ceo rad moguć samo tastaturom, uvek vidljiv fokus.

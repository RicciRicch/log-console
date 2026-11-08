# PRODUCT.md

Kontekst proizvoda za Impeccable. `/impeccable init` čita ovaj fajl i na osnovu njega pravi `DESIGN.md`.

## Šta je proizvod

Konzola (radni naziv) je alat za firme koje šalju pakete: jedno mesto za sve pošiljke, statuse i otkupe, za sve kurire. Zamenjuje rad po kurirskim portalima i Google Sheet tabelama.

## Ko ga koristi

- **Operater** (glavni korisnik): zaposleni u web shopu, magacinu ili fulfillment centru. Ceo dan radi u konzoli na desktop računaru, često sa velikim brojem pošiljki (desetine do hiljade dnevno). Hoće da brzo vidi šta je zapelo i da reaguje.
- **Administrator firme**: vlasnik ili šef. Gleda novac (otkupe), odobrava isplate, upravlja nalozima.
- **Pod-klijent** (kasnije): klijent fulfillment centra, samo pregled.

Kontekst korišćenja: kancelarija ili magacin, veliki monitor, miš i tastatura, ponekad laptop. Mobilni nije prioritet za MVP.

## Ličnost brenda

Pouzdano, mirno, precizno. Kao dobar kontrolni panel: informacija je na prvom mestu, ukrasi ne postoje. Korisnik treba da oseti da ima kontrolu nad pošiljkama i novcem.

Nije: razigrano, šareno, "startup" marketinški izgled, ljubičasti gradijenti, velike ilustracije.

## Dizajn principi

1. **Gustina pre dekoracije.** Tabele sa mnogo redova su glavni ekran. Čitljivost velikih lista je važnija od praznog prostora.
2. **Problem se vidi odmah.** Zaglavljene, neuspele i nepreuzete pošiljke moraju da iskoče bez traženja.
3. **Boja nikad nije jedini signal.** Status uvek ima i tekst (i ikonicu), zbog pristupačnosti i štampe.
4. **Akcije nad više redova odjednom** (selekcija, batch akcije) su prirodne, ne skrivene.
5. **Brojevi su poravnati i čitljivi** (tabular nums), novac uvek sa valutom.

## Fiksne semantičke boje

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

## Jezik i formati

- UI na srpskom, latinica.
- Datum `08.11.2026.`, vreme `14:35`, novac `1.250,00 RSD`.
- Ton: kratko i jasno, bez žargona. "Za ispravku", ne "Validation failed".

## Glavni ekrani (MVP)

1. Lista pošiljki (filteri po statusu, kuriru, datumu; pretraga po broju pošiljke i primaocu)
2. Detalj pošiljke (istorija statusa)
3. Upozorenja (Zaglavljeno, Nije preuzeto, Neuspela dostava)
4. Uvoz (fajl ili Google Sheet, mapiranje kolona, pregled grešaka)
5. Otkupi i uplate (faze, sparivanje, specifikacija)
6. Podešavanja firme (korisnici, kurirski API ključevi)

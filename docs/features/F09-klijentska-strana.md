# F09: Klijentska strana

**Status:** Ideja · **Vlasnik:** Dule (UI) + Uroš (baza) · **Faza:** M1? (čeka ADR-010) · **Zavisi od:** F01, F06

## Cilj
Firma čije pakete šaljemo (klijent operatera, npr. web shop) sama vidi svoje pošiljke i otkupe, bez pitanja operatera i bez kurirskih portala.

## Korisnička priča
Kao klijent, želim da otvorim svoju stranu i vidim gde su moji paketi i koliko mi novca od otkupa sledi, da ne bih zvao operatera.

## Obim
**Ulazi:**
- Prijava klijenta, lista samo njegovih pošiljki, detalj sa istorijom, pregled otkupa (samo čitanje)

**Ne ulazi:**
- Izmena pošiljki, uvoz, podešavanja kurira, upozorenja operatera

## Kriterijumi prihvatanja
- [ ] Klijent A nikad ne vidi pošiljke klijenta B, ni pošiljke operatera koje nisu njegove (RLS + test)
- [ ] Ista vizuelna celina kao operaterska strana (Linija rute), ali mirnija: bez batch akcija i upozorenja

## Tehničke beleške
Zavisi od odluke u ADR-010 (model `client_id` i uloga `client`).

## Zadaci
- [ ] Potvrditi ADR-010 sa timom
- [ ] `/impeccable shape` za klijentsku listu

## Otvorena pitanja
- Kako klijent dobija nalog: poziva ga operater ili admin firme?
- Da li klijent vidi i telefon i adresu primaoca, ili samo status?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Dule | Otvoren predlog (ADR-010) |

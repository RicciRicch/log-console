# F07: Otkupi i uplate

**Status:** Ideja · **Vlasnik:** Uroš (logika), Dule (UI) · **Faza:** M2 · **Zavisi od:** F04

## Cilj
Za svaki otkup se zna gde je novac: kod kupca, kod kurira ili isplaćen klijentu. Dnevno sparivanje uplata traje minute.

## Obim
**Ulazi:** 4 faze otkupa, uvoz BEX izveštaja o uplatama (fajl), sparivanje po broju pošiljke, lista nesparenih, izbor šta se isplaćuje, specifikacija (PDF i Excel), audit log.
**Ne ulazi:** automatsko povlačenje uplata sa API-ja (BEX ga nema), bankovni izvodi.

## Kriterijumi prihvatanja
- [ ] Faza se menja sama: Isporučeno → "Naplaćeno, kod kurira"; u izveštaju → "Kurir uplatio"
- [ ] Nespareni redovi iz izveštaja idu u listu za proveru sa razlogom
- [ ] Isti izveštaj uvezen dva puta ne duplira uplate
- [ ] Samo admin može da označi isplatu, a svaka isplata je u audit logu
- [ ] Specifikacija sadrži broj pošiljke, primaoca, iznos i ukupno

## Zadaci
- [ ] Tabele `cod_items`, `payouts`
- [ ] Parser BEX izveštaja (treba primer fajla)
- [ ] Posao `match-cod-payments`
- [ ] Ekran otkupa po fazama + zbirovi
- [ ] Generisanje specifikacije (PDF + Excel)

## Otvorena pitanja
- Kako izgleda BEX izveštaj o uplatama? Treba primer.
- Da li se otkup ikad isplaćuje delimično?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

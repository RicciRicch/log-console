# F05: Upozorenja

**Status:** Spec · **Vlasnik:** Velja (logika), Dule (UI) · **Faza:** M1 · **Zavisi od:** F04

## Cilj
Problematične pošiljke se same izdvajaju, da operater ne traži ručno šta je zapelo.

## Obim
**Ulazi:** dve vrste upozorenja (Neuspela dostava, Zaglavljeno), lista po vrsti, označavanje kao rešeno, podešavanje broja dana po firmi.
**Ne ulazi:** email/SMS notifikacije, automatski poziv kupcu, upozorenje "Nije preuzeto" (vidi otvorena pitanja).

## Kriterijumi prihvatanja
- [ ] **Neuspela dostava:** druga neuspela dostava ili odbijanje → primalac označen crveno, upozorenje "Pozvati kupca"
- [ ] **Zaglavljeno:** nema promene statusa duže od N dana (podrazumevano 3, menja se po firmi)
- [ ] Upozorenje se samo zatvara kad se uslov više ne ispunjava
- [ ] Broj otvorenih upozorenja se vidi u navigaciji

## Tehničke beleške
- Broj neuspelih pokušaja se računa iz `shipment_events` (događaji sa statusom `failed_delivery`), ne iz trenutnog statusa pošiljke.
- Kod BEX-a je neuspeo pokušaj događaj `statusCode = 11` sa `reasonCode != 0`, a razlog je u `statusName` (npr. "Bio na adresi - Ne javlja se na telefon"). Razlog treba prikazati operateru uz upozorenje. Lista razloga je u F03.
- Koji BEX `reasonCode` znači odbijanje još ne znamo (pitanje za BEX u F03).
- Podešavanja po firmi su u `tenant_settings` (`stuck_after_days`, `timezone`).
- Tabela `alerts` (vrste `failed_delivery`, `stuck`) je u migraciji `20261108200300_alerts_sheets.sql`. Najviše jedno otvoreno upozorenje iste vrste po pošiljci, pa `evaluate-alerts` može bezbedno da se pokreće više puta.

## Zadaci
- [x] Tabele `alerts` i `tenant_settings` (Uroš, šema M0)
- [ ] Posao `evaluate-alerts`
- [ ] Ekran "Upozorenja" sa tabovima po vrsti
- [ ] Bedž sa brojem u navigaciji

## Otvorena pitanja
- Šta je "kraj dana" za "Nije preuzeto"? **Odgovor vlasnika proizvoda (08.11.2026.):** kurir nekad ne skenira paket, pa pošiljka izgleda nepreuzeto do sledećeg skeniranja. Pratimo samo statuse sa API-ja. **Odlučeno:** upozorenje "Nije preuzeto" je izbačeno iz MVP-a, ostaju "Neuspela dostava" i "Zaglavljeno" (vidi `docs/PILOT-PRIMERI.md`).

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

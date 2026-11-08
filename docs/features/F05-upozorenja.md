# F05: Upozorenja

**Status:** Spec · **Vlasnik:** Velja (logika), Dule (UI) · **Faza:** M1 · **Zavisi od:** F04

## Cilj
Problematične pošiljke se same izdvajaju, da operater ne traži ručno šta je zapelo.

## Obim
**Ulazi:** tri vrste upozorenja, lista po vrsti, označavanje kao rešeno, podešavanje broja dana po firmi.
**Ne ulazi:** email/SMS notifikacije, automatski poziv kupcu.

## Kriterijumi prihvatanja
- [ ] **Neuspela dostava:** druga neuspela dostava ili odbijanje → primalac označen crveno, upozorenje "Pozvati kupca"
- [ ] **Zaglavljeno:** nema promene statusa duže od N dana (podrazumevano 3, menja se po firmi)
- [ ] **Nije preuzeto:** kreirano, a kurir nije preuzeo do kraja dana
- [ ] Upozorenje se samo zatvara kad se uslov više ne ispunjava
- [ ] Broj otvorenih upozorenja se vidi u navigaciji

## Tehničke beleške
- Broj neuspelih pokušaja se računa iz `shipment_events` (događaji sa statusom `failed_delivery`), ne iz trenutnog statusa pošiljke.
- Podešavanja po firmi su u `tenant_settings` (`stuck_after_days`, `pickup_cutoff_time`, `timezone`).

## Zadaci
- [ ] Tabele `alerts` i `tenant_settings`
- [ ] Posao `evaluate-alerts`
- [ ] Ekran "Upozorenja" sa tabovima po vrsti
- [ ] Bedž sa brojem u navigaciji

## Otvorena pitanja
- Šta je "kraj dana" za "Nije preuzeto"? (npr. 18:00 po firmi)

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

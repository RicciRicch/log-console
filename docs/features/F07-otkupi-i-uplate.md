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

## Tehničke beleške
- Format BEX specifikacije je opisan u [`docs/PILOT-PRIMERI.md`](../PILOT-PRIMERI.md). Prvi red je spojena ćelija sa nazivima, parser ga preskače i čita kolone po poziciji.
- `cod_payments`: jedan red po stavci iz izveštaja kurira. Otkup se ne isplaćuje delimično, pa je unique ključ `(tenant_id, courier_code, tracking_number)`.
- Iznos iz izveštaja se poredi sa `shipments.cod_amount`. Razlika ne ruši sparivanje, nego ide u `match_error`.
- Nespareni red ostaje u `cod_payments` sa `shipment_id = null` i razlogom u `match_error`.
- Oznaka klijenta iz kolone "Napomena klijenta" se čuva (`client_ref`), da bi specifikacija kasnije mogla po klijentu fulfillment centra.

## Zadaci
- [x] Tabele `cod_payments`, `cod_items`, `payouts` (`20261108200400_cod.sql`, testovi `05_cod`)
- [x] Faza se menja sama sa statusom pošiljke (triger), uplaćen otkup se ne vraća unazad
- [x] Sparivanje u bazi: `match_cod_payments(tenant_id)` (idempotentno, samo worker)
- [x] Isplata: `create_payout(...)` (samo admin sa MFA, audit log, isplaćuje se iznos koji je kurir uplatio)
- [ ] Parser BEX izveštaja (primer stigao, vidi `docs/PILOT-PRIMERI.md`)
- [ ] Worker posao `match-cod-payments` (posle uvoza poziva `match_cod_payments`)
- [ ] Ekran otkupa po fazama + zbirovi
- [ ] Generisanje specifikacije (PDF + Excel)

## Otvorena pitanja
- ~~Kako izgleda BEX izveštaj o uplatama?~~ Primer stigao, vidi `docs/PILOT-PRIMERI.md`.
- ~~Da li se otkup ikad isplaćuje delimično?~~ Ne.
- Da li specifikacija za klijenta treba da bude po klijentu fulfillment centra (npr. samo `NR`)? Verovatno da, ali pod-klijenti nisu u MVP-u.

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

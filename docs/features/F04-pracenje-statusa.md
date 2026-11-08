# F04: Automatsko praćenje statusa i istorija

**Status:** Spec · **Vlasnik:** Velja · **Faza:** M1 · **Zavisi od:** F02, F03

## Cilj
Konzola sama, bez klikanja, drži statuse svih aktivnih pošiljki ažurnim i čuva celu istoriju promena.

## Obim
**Ulazi:** worker posao na svakih sat vremena, samo pošiljke koje nisu završene, `shipment_events` sa vremenom, ručno "Osveži sada" za jednu pošiljku.
**Ne ulazi:** webhook-ovi kurira.

## Kriterijumi prihvatanja
- [ ] Status aktivne pošiljke nije stariji od 60 minuta
- [ ] Isporučene i vraćene pošiljke (`is_final`) se više ne proveravaju
- [ ] Novi događaj se upisuje kad se promeni sirovi status kurira ili razlog neuspeha, ne samo jedinstveni status (dva uzastopna neuspela pokušaja su dva događaja)
- [ ] Isti odgovor kurira obrađen dva puta ne pravi duplikat događaja
- [ ] Pad kurirskog API-ja ne ruši posao: ponovni pokušaj sa pauzom, greška vidljiva u logu
- [ ] Jedna firma sa puno pošiljki ne blokira ostale (posao po firmi)

## Tehničke beleške
- pg-boss: `poll-statuses` (cron, raspoređuje po firmi) → `poll-tenant-courier` (radi batch-eve)
- Posle upisa okida `evaluate-alerts` (F05) i `sync-google-sheet` (F08)
- Događaj je nov ako se razlikuje bar jedno od: `raw_status`, `raw_reason`, `occurred_at` (vreme događaja kod kurira, ako ga API vraća). Unique `NULLS NOT DISTINCT` na `(shipment_id, raw_status, raw_reason, occurred_at)` čuva od duplikata pri ponovljenom pollingu.
- F05 broji neuspele pokušaje iz `shipment_events`, zato se nijedan pokušaj ne sme "progutati".

## Zadaci
- [ ] Postavljanje pg-boss u worker-u
- [ ] Cron posao i posao po firmi
- [ ] Upis `shipment_events` + ažuriranje `shipments.status`, `last_status_at`, `is_final`
- [ ] Retry i backoff
- [ ] "Osveži sada" (endpoint ili RPC)
- [ ] Test sa 10.000 pošiljki (vreme izvršavanja)

## Otvorena pitanja
- Da li je 60 minuta dovoljno ili pilot traži češće?
- Da li BEX API vraća vreme svakog događaja ili samo trenutni status? Ako samo trenutni, dva neuspela pokušaja sa istim razlogom između dva pollinga se ne mogu razlikovati.

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

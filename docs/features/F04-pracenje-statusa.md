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
- [ ] Novi događaj se upisuje samo kad se status stvarno promeni (bez duplikata)
- [ ] Pad kurirskog API-ja ne ruši posao: ponovni pokušaj sa pauzom, greška vidljiva u logu
- [ ] Jedna firma sa puno pošiljki ne blokira ostale (posao po firmi)

## Tehničke beleške
- pg-boss: `poll-statuses` (cron, raspoređuje po firmi) → `poll-tenant-courier` (radi batch-eve)
- Posle upisa okida `evaluate-alerts` (F05) i `sync-google-sheet` (F08)

## Zadaci
- [ ] Postavljanje pg-boss u worker-u
- [ ] Cron posao i posao po firmi
- [ ] Upis `shipment_events` + ažuriranje `shipments.status`, `last_status_at`, `is_final`
- [ ] Retry i backoff
- [ ] "Osveži sada" (endpoint ili RPC)
- [ ] Test sa 10.000 pošiljki (vreme izvršavanja)

## Otvorena pitanja
- Da li je 60 minuta dovoljno ili pilot traži češće?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

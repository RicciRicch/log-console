# F04: Automatsko praćenje statusa i istorija

**Status:** Spec · **Vlasnik:** Velja · **Faza:** M1 · **Zavisi od:** F02, F03

## Cilj
Konzola sama, bez klikanja, drži statuse svih aktivnih pošiljki ažurnim i čuva celu istoriju promena.

## Obim
**Ulazi:** worker posao na svakih sat vremena, samo pošiljke koje nisu završene, `shipment_events` sa vremenom, ručno "Osveži sada" za jednu pošiljku.
**Ne ulazi:** webhook-ovi kurira.

## Kriterijumi prihvatanja
- [ ] Status aktivne pošiljke nije stariji od 60 minuta
- [ ] Isporučene i vraćene pošiljke (`is_final`) se više ne proveravaju, ali tek posle perioda čekanja (BEX ume da ispravi "Dostavljeno", vidi F03)
- [ ] Novi događaj se upisuje kad se promeni sirovi status kurira ili razlog neuspeha, ne samo jedinstveni status (dva uzastopna neuspela pokušaja su dva događaja)
- [ ] Isti odgovor kurira obrađen dva puta ne pravi duplikat događaja
- [ ] Pad kurirskog API-ja ne ruši posao: ponovni pokušaj sa pauzom, greška vidljiva u logu
- [ ] Jedna firma sa puno pošiljki ne blokira ostale (posao po firmi)

## Tehničke beleške
- pg-boss: `poll-statuses` (cron, raspoređuje po firmi) → `poll-tenant-courier` (radi batch-eve)
- Posle upisa okida `evaluate-alerts` (F05) i `sync-google-sheet` (F08)
- Događaj je nov ako se razlikuje bar jedno od: `raw_status`, `raw_reason`, `occurred_at` (vreme događaja kod kurira, ako ga API vraća). Unique `NULLS NOT DISTINCT` na `(shipment_id, raw_status, raw_reason, occurred_at)` čuva od duplikata pri ponovljenom pollingu.
- F05 broji neuspele pokušaje iz `shipment_events`, zato se nijedan pokušaj ne sme "progutati".
- `shipments.status` = status poslednjeg događaja po vremenu (pa po redosledu u odgovoru), ne "najdalji" status.
- **`is_final` (predlog):** pošiljka postaje konačna tek kad je poslednji događaj `delivered` ili `returned` i od njega je prošlo 48 h bez novih događaja. Do tada se proverava normalno. U stvarnim podacima BEX je ispravljao "Dostavljeno" posle 2–7 minuta (2 od 30 pošiljki).

## Zadaci
- [ ] Postavljanje pg-boss u worker-u
- [ ] Čitanje BEX ključa iz Vault-a po firmi (ADR-008), ključ se nikad ne loguje (preuzeto iz F03)
- [ ] Cron posao i posao po firmi
- [ ] Upis `shipment_events` + ažuriranje `shipments.status`, `last_status_at`, `is_final`
- [ ] Retry i backoff
- [ ] "Osveži sada" (endpoint ili RPC)
- [ ] Test sa 10.000 pošiljki (vreme izvršavanja)

## Otvorena pitanja
- Da li je 60 minuta dovoljno ili pilot traži češće?
- ~~Da li BEX API vraća vreme svakog događaja?~~ Da: `shipmentHistory` vraća celu istoriju sa `timeStamp`, a neuspeo pokušaj je poseban događaj (vidi F03).
- Da li je 48 h čekanja pre `is_final` dovoljno? Pitali smo BEX koliko kasno može da ispravi status.
- Kad se "Dostavljeno" poništi, da li UI i Google Sheet treba da prikažu da je status ispravljen?
- BEX nema batch endpoint, pa je jedan zahtev po pošiljci. Posao po firmi mora da ograniči istovremene zahteve (limit čekamo od BEX-a).

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

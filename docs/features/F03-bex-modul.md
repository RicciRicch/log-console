# F03: BEX modul

**Status:** Spec · **Vlasnik:** Velja · **Faza:** M1 · **Zavisi od:** F00

## Cilj
Prvi kurirski modul: za listu brojeva pošiljki vraća trenutni status i istoriju iz BEX API-ja i prevodi ih u naš jedinstveni status.

## Obim
**Ulazi:** `CourierAdapter` interfejs, BEX klijent, `getStatuses` preko `shipmentHistory`, mapiranje BEX šifara u 6 statusa, rukovanje greškama i limitima.
**Ne ulazi:** kreiranje pošiljki, nalepnice, uplate otkupa (vidi otvoreno pitanje o `getState` šifri 9).

## Kriterijumi prihvatanja
- [ ] `getStatuses` prima listu brojeva, a BEX zove po jedan broj sa ograničenim brojem istovremenih zahteva (BEX nema batch endpoint)
- [ ] Svaka poznata BEX šifra mapirana, a nepoznata se loguje i ne ruši posao
- [ ] Neuspela dostava se prepoznaje (način zavisi od odgovora BEX-a, vidi otvorena pitanja)
- [ ] Greška za jednu pošiljku (404, timeout) ne ruši ostale u istom pozivu
- [ ] Testovi sa snimljenim BEX odgovorima (bez pravog API-ja u CI-ju)
- [ ] Ključ se čita samo iz Vault-a, nikad se ne loguje

## Tehničke beleške

Izvor: javna dokumentacija <https://bexexpress.rs/DevDocumentation> (pročitano 08.11.2026.).

### Pristup
- Ugovor sa BEX-om (`ponude@bex.rs`), pa zahtev za token na `api@bex.rs` uz broj ugovora. Token stiže mejlom zajedno sa `KlijentId`.
- Autentifikacija: zaglavlje `X-AUTH-TOKEN`. JSON, samo HTTPS.
- Token je po firmi-klijentu, čuva se u Vault-u (ADR-008). `KlijentId` nije tajna, može u `courier_accounts` ako zatreba.
- Sandbox i limiti zahteva nisu navedeni u dokumentaciji.

### Endpoint za status: `shipmentHistory` (koristimo ovaj)
`GET https://integrations.bexexpress.rs/api/Shipments/shipmentHistory?trackingValue=<broj>`

- Jedan broj pošiljke po zahtevu. Vraća celu istoriju, iste podatke kao praćenje na sajtu.
- Odgovor: `eventPrediction` (slobodan tekst: maskirani primalac, očekivana dostava, napomena kurira pri pokušaju dostave) i `listShipmentHistory[]` sa poljima `shipmentId`, `statusCode`, `scanCode`, `reasonCode`, `statusName`, `statusDate`, `statusLocation`, `timeStamp`, `timeZone` (npr. `GMT+2`).
- Svaki događaj ima svoje vreme, pa F04 može da razlikuje događaje po `(statusCode, reasonCode, timeStamp)`.
- Opterećenje: 10.000 aktivnih pošiljki na sat ≈ 2,8 zahteva u sekundi. Treba ograničiti istovremene zahteve i dodati backoff dok BEX ne kaže limit.

### Stari endpoint: `getState` (ne koristimo za statuse)
`GET https://api.bex.rs:62503/ship/api/Ship/getstate?shipmentid=<broj>&mtype=1|2&lang=1|2`

- Samo trenutni status, bez istorije. Sažete šifre: 1 nije pronađena, 2 izbrisana, 3 nije poslata još uvek, 4 preuzeta, 5 isporučena, 6 nije poslata (potvrda adrese), 7 vratiti pošiljaocu, 8 vraćena pošiljaocu, 9 isplaćena otkupnina.
- U dokumentaciji se port razlikuje (62503 u tekstu, 62502 u curl primeru).
- Šifra 9 i tekst „Gotovina transfera isplaćena pošiljaocu“ izgledaju kao podatak o isplati otkupa po pošiljci. To može da bude važno za F07 i ADR-006.

### Mapiranje (`shipmentHistory.statusCode`)

| BEX šifra | Naziv | Naš status |
| --- | --- | --- |
| -51 | Carina | `in_transit` (predlog) |
| -21 | Za PP (provera adrese kod operatera) | nije odlučeno, vidi otvorena pitanja |
| 1 | Evidentirano | `created` |
| 11 | Preuzeto | `in_transit` |
| 11 + razlog neuspeha | Preuzeto, neuspeo pokušaj | `failed_delivery` (kako se prepoznaje, nije potvrđeno) |
| 21 | Dostavljeno | `delivered` |
| 25 | Vratiti pošiljaocu | `returning` |
| 30 | Vraćena pošiljaocu | `returned` |

Lista `reasonCode` vrednosti nije objavljena.

## Zadaci
- [x] Proučiti javnu BEX API dokumentaciju (autentifikacija, endpoint za status, šifre)
- [ ] Poslati pitanja BEX-u na `api@bex.rs` (lista u „Otvorena pitanja“)
- [ ] Dobiti token za pilot firmu i snimiti stvarne odgovore, posebno pošiljku sa neuspelim pokušajem dostave
- [ ] `packages/shared`: `UnifiedStatus`
- [ ] `packages/couriers/core`: `CourierAdapter` (`CourierStatus` sa sirovom šifrom, razlogom neuspeha i vremenom događaja)
- [ ] `packages/couriers/bex`: klijent + `getStatuses` + `mapStatus`, ograničenje istovremenih zahteva i backoff
- [ ] Snimljeni odgovori (fixtures, sa izmišljenim podacima) i testovi
- [ ] Dopuniti tabelu šifara i `reasonCode` posle odgovora BEX-a

## Otvorena pitanja
Za BEX (`api@bex.rs`):
- Koliki je limit zahteva (u sekundi, na dan) za `shipmentHistory`? Postoji li endpoint za više pošiljki odjednom?
- Postoji li test (sandbox) okruženje?
- Kako se u `listShipmentHistory` vidi neuspeo pokušaj dostave? U primeru iz dokumentacije napomena kurira o pokušaju postoji samo u `eventPrediction`, a u istoriji nema događaja sa `reasonCode`. Ako je tako, F05 bi morao da čita slobodan tekst, što je krhko.
- Koja je lista `reasonCode` vrednosti (odbijanje, primalac se ne javlja, pogrešna adresa...)?
- Da li se otkup (šifra 9 u `getState`) može pratiti po pošiljci i preko `shipmentHistory`, i da li postoji datum i iznos uplate?

Za tim:
- Šifra -21 (provera adrese): `created` ili `failed_delivery`? Zavisi od toga da li se javlja pre preuzimanja ili posle pokušaja dostave.
- Ako se isplata otkupa vidi po pošiljci kroz API, da li menjamo ADR-006 (uvoz fajla) u F07?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Velja | Pročitana javna BEX API dokumentacija, upisani endpoint, šifre i pitanja za BEX |

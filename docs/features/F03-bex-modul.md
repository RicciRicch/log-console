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
- [ ] Neuspela dostava se prepoznaje: `statusCode = 11` i `reasonCode != 0` (potvrđeno na stvarnim podacima)
- [ ] Trenutni status se računa iz poslednjeg događaja po vremenu, ne iz najvišeg statusa (BEX ume da vrati "Dostavljeno" pa ga ispravi)
- [ ] Greška za jednu pošiljku (400 „ne postoji“, timeout) ne ruši ostale u istom pozivu
- [ ] Testovi sa snimljenim BEX odgovorima (bez pravog API-ja u CI-ju)
- [ ] Ključ se čita samo iz Vault-a, nikad se ne loguje

## Tehničke beleške

Izvori: javna dokumentacija <https://bexexpress.rs/DevDocumentation> i 30 stvarnih pošiljki pilot firme iz januara 2026. (snimljeno 08.11.2026. skriptom `tools/bex-probe.mjs`).

### Pristup
- Ugovor sa BEX-om (`ponude@bex.rs`), pa zahtev za token na `api@bex.rs` uz broj ugovora. Token stiže mejlom zajedno sa `KlijentId`.
- Autentifikacija: zaglavlje `X-AUTH-TOKEN`. JSON, samo HTTPS.
- Token je po firmi-klijentu, čuva se u Vault-u (ADR-008). `KlijentId` nije tajna, može u `courier_accounts` ako zatreba.
- Sandbox i limiti zahteva nisu navedeni u dokumentaciji. Odgovor nema rate-limit zaglavlja.

### Endpoint za status: `shipmentHistory` (koristimo ovaj)
`GET https://integrations.bexexpress.rs/api/Shipments/shipmentHistory?trackingValue=<broj>`

- Jedan broj pošiljke po zahtevu. Vraća celu istoriju, iste podatke kao praćenje na sajtu.
- Odgovor: `eventPrediction` (slobodan tekst sa maskiranim primaocem, ne koristimo ga) i `listShipmentHistory[]` sa poljima `shipmentId`, `statusCode`, `scanCode`, `reasonCode`, `statusName`, `statusDate`, `statusLocation`, `timeStamp`, `timeZone`.
- **Vreme:** `timeStamp` je lokalno vreme bez zone (`2026-01-05T09:46:42`), a zona je posebno u `timeZone` (`GMT+1` zimi, `GMT+2` leti). U UTC se pretvara pomoću `timeZone`, ne pretpostavkom.
- Dva događaja mogu imati isto vreme do sekunde (npr. `1` i `-21` u istoj sekundi). Redosled u nizu je hronološki i treba ga čuvati.
- Brzina: 100–420 ms po zahtevu. 30 zahteva sa pauzom od 0,5 s prošlo bez greške.
- Opterećenje: 10.000 aktivnih pošiljki na sat ≈ 2,8 zahteva u sekundi. Treba ograničiti istovremene zahteve i dodati backoff dok BEX ne kaže limit.

### Greške
| HTTP | Telo | Značenje |
| --- | --- | --- |
| 400 | `Shipment with provided trackingValue doesn't exist. (Parameter 'trackingValue')` | Broj ne postoji ili nije sa ovog ugovora. Ne ponavljati, označiti pošiljku. |
| 401 | `Token is not valid.` | Loš ili povučen ključ. Zaustaviti posao za tu firmu i javiti adminu. |

### Mapiranje `statusCode` u naš status

| BEX šifra | Naziv | Naš status |
| --- | --- | --- |
| -51 | Carina | `in_transit` (predlog, nije viđeno u podacima) |
| -21 | Evidentirano – Na proveri podataka | `created` (u podacima se javlja odmah po evidentiranju i vraća na `1` posle nekoliko sekundi) |
| 1 | Evidentirano | `created` |
| 11, `reasonCode = 0` | Preuzeto | `in_transit` |
| 11, `reasonCode != 0` | Preuzeto - Neuspela dostava - … | `failed_delivery` |
| 21 | Dostavljeno | `delivered` |
| 25 | Vratiti pošiljaocu | `returning` |
| 30 | Vraćena pošiljaocu | `returned` (nije viđeno u podacima) |

### `reasonCode` (viđeno u podacima, nije potpuna lista)
Uvek uz `statusCode = 11` i `scanCode = 100`. Tekst razloga je i u `statusName`.

| reasonCode | Razlog |
| --- | --- |
| 145 | Bio na adresi - Ne javlja se na telefon |
| 156 | Doći će u magacin |
| 392 | Doći će u paket shop |

### `scanCode` (viđeno u podacima)
| scanCode | Značenje (iz `statusName`) |
| --- | --- |
| 0 | Sistemski događaj (evidentiranje, ispravka) |
| 2 | Dostavljeno |
| 7 | Utovar linijskog za CM |
| 15 | Popis magacina |
| 30 | Vratiti pošiljaocu |
| 100 | Neuspela dostava |

### Važno: „Dostavljeno“ nije konačno
U 2 od 30 pošiljki BEX je upisao `21 Dostavljeno`, pa ga posle nekoliko minuta ispravio:

- `21` → 7 min kasnije `11 Neuspela dostava` → 4 dana kasnije `21` (fixture `delivered-then-reverted.json`)
- `21` → 2 min kasnije `11 Preuzeto` → neuspela dostava → `25 Vratiti pošiljaocu` → `11` → `21` (fixture `return-cancelled.json`)

I `25 Vratiti pošiljaocu` može da bude poništen. Posledice za F04: `is_final` se ne sme postaviti čim stigne `21`. Predlog je u F04.

### Stari endpoint: `getState` (ne koristimo za statuse)
`GET https://api.bex.rs:62503/ship/api/Ship/getstate?shipmentid=<broj>&mtype=1|2&lang=1|2`

- Samo trenutni status, bez istorije. Sažete šifre: 1 nije pronađena, 2 izbrisana, 3 nije poslata još uvek, 4 preuzeta, 5 isporučena, 6 nije poslata (potvrda adrese), 7 vratiti pošiljaocu, 8 vraćena pošiljaocu, 9 isplaćena otkupnina.
- U dokumentaciji se port razlikuje (62503 u tekstu, 62502 u curl primeru).
- Šifra 9 i tekst „Gotovina transfera isplaćena pošiljaocu“ izgledaju kao podatak o isplati otkupa po pošiljci. To može da bude važno za F07 i ADR-006. Nije još isprobano.

### Fixtures
`packages/couriers/bex/test/fixtures/shipment-history/`: stvarni nizovi događaja iz pilot firme, sa izmišljenim brojem pošiljke, mestom i `eventPrediction`. Sirovi odgovori su lokalno u `tools/bex-probe/out/` i ne idu u git.

| Fajl | Slučaj |
| --- | --- |
| `delivered.json` | 1 → 11 → 21 |
| `failed-then-delivered.json` | 1 → -21 → 1 → 11 → neuspela (145) → 21 |
| `failed-parcel-shop.json` | 1 → 11 → neuspela (392) → 21 |
| `delivered-then-reverted.json` | 21 pa ispravka u neuspelu (156) pa opet 21 |
| `return-cancelled.json` | 21 → 11 → neuspela (392) → 25 → 11 → 21 |
| `not-found.json` | 400 |
| `unauthorized.json` | 401 |

## Zadaci
- [x] Proučiti javnu BEX API dokumentaciju (autentifikacija, endpoint za status, šifre)
- [x] Dobiti token za pilot firmu i snimiti stvarne odgovore, posebno pošiljku sa neuspelim pokušajem dostave
- [x] Snimljeni odgovori (fixtures, sa izmišljenim podacima)
- [ ] Poslati preostala pitanja BEX-u na `api@bex.rs` (lista u „Otvorena pitanja“)
- [ ] `packages/shared`: `UnifiedStatus`
- [ ] `packages/couriers/core`: `CourierAdapter` (`CourierStatus` sa sirovom šifrom, razlogom neuspeha i vremenom događaja)
- [ ] `packages/couriers/bex`: klijent + `getStatuses` + `mapStatus`, ograničenje istovremenih zahteva i backoff
- [ ] Testovi nad fixtures
- [ ] Snimiti pošiljku sa `30 Vraćena pošiljaocu` i sa isplaćenim otkupom, dopuniti tabele

## Otvorena pitanja
Za BEX (`api@bex.rs`):
- Koliki je limit zahteva (u sekundi, na dan) za `shipmentHistory`? Postoji li endpoint za više pošiljki odjednom?
- Postoji li test (sandbox) okruženje?
- Koja je potpuna lista `reasonCode` i `scanCode` vrednosti? Koji `reasonCode` znači odbijanje pošiljke?
- Koliko dugo posle `21 Dostavljeno` BEX može da ispravi status?
- Da li se otkup (šifra 9 u `getState`) može pratiti po pošiljci i preko `shipmentHistory`, i da li postoji datum i iznos uplate?

Za tim:
- Ako se isplata otkupa vidi po pošiljci kroz API, da li menjamo ADR-006 (uvoz fajla) u F07?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |
| 08.11.2026. | Velja | Pročitana javna BEX API dokumentacija, upisani endpoint, šifre i pitanja za BEX |
| 08.11.2026. | Velja | Snimljeno 30 stvarnih pošiljki: potvrđeno kako izgleda neuspela dostava, nađeno da "Dostavljeno" nije konačno, dodati fixtures |

# F03: BEX modul

**Status:** Spec · **Vlasnik:** Velja · **Faza:** M1 · **Zavisi od:** F00

## Cilj
Prvi kurirski modul: za listu brojeva pošiljki vraća trenutni status iz BEX API-ja i prevodi ga u naš jedinstveni status.

## Obim
**Ulazi:** `CourierAdapter` interfejs, BEX klijent, `getStatuses`, mapiranje BEX šifara u 6 statusa, rukovanje greškama i limitima.
**Ne ulazi:** kreiranje pošiljki, nalepnice, uplate (nisu u javnom API-ju).

## Kriterijumi prihvatanja
- [ ] `getStatuses` radi u batch-evima i poštuje limite BEX API-ja
- [ ] Svaka poznata BEX šifra mapirana, a nepoznata se loguje i ne ruši posao
- [ ] Neuspela dostava se prepoznaje (Preuzeto + razlog neuspeha)
- [ ] Testovi sa snimljenim BEX odgovorima (bez pravog API-ja u CI-ju)
- [ ] Ključ se čita samo iz Vault-a, nikad se ne loguje

## Tehničke beleške
Mapiranje (iz dokumenta sa idejom, dopuniti posle istraživanja API-ja):

| BEX | Naš status |
| --- | --- |
| Evidentirano (1) | `created` |
| Preuzeto (11) | `in_transit` |
| Preuzeto + razlog neuspeha | `failed_delivery` |
| Dostavljeno (21) | `delivered` |
| Vratiti pošiljaocu (25) | `returning` |
| Vraćena pošiljaocu (30) | `returned` |

## Zadaci
- [ ] Proučiti BEX API dokumentaciju (autentifikacija, endpoint za status, limiti, sve šifre)
- [ ] `packages/couriers/core`: `CourierAdapter`, `UnifiedStatus`
- [ ] `packages/couriers/bex`: klijent + `getStatuses` + `mapStatus`
- [ ] Snimljeni odgovori (fixtures) i testovi
- [ ] Kompletna tabela BEX šifara u ovom fajlu

## Otvorena pitanja
- Koliko pošiljki može u jednom zahtevu i koliki je limit zahteva?
- Postoji li test (sandbox) okruženje?

## Dnevnik
| Datum | Ko | Šta |
| --- | --- | --- |

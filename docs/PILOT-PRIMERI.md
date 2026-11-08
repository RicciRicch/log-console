# Primeri fajlova iz pilot firme

Opis **strukture** dva stvarna fajla koje je dao vlasnik proizvoda (08.11.2026.). Sami fajlovi sadrže prave podatke kupaca i **nisu u repou**. Za testove pravimo izmišljene fajlove iste strukture.

## Ko je ko

- Pilot firma je **fulfillment centar** (u BEX specifikaciji je ona "Primalac otkupa" i vlasnik računa).
- Fulfillment centar šalje za više svojih klijenata. Tabela ispod je tabela **jednog klijenta** (prefiks `NR` u šiframa proizvoda).
- U BEX specifikaciji se klijent vidi u koloni "Napomena klijenta" (npr. `NR`, `SF1`, `173`). Jedna specifikacija meša pošiljke više klijenata.

Posledica: pod-klijenti nisu u MVP-u, ali svaka pošiljka i svaka uplata čuva **oznaku klijenta** (`client_ref`), da bi specifikacija mogla da se podeli po klijentu bez izmene šeme.

## 1. Tabela klijenta (ulaz za F02)

Excel, list `Sheet1`, ~15.000 porudžbina od 01.2025. Prvi red je zaglavlje. Ostali listovi su pomoćni (spiskovi proizvoda) i uvoz ih ignoriše.

| Kolona | Zaglavlje | Sadržaj | Napomena za uvoz |
| --- | --- | --- | --- |
| A | (broj porudžbine) | `PN/220554` | broj porudžbine u shopu; prazno = nastavak prethodne porudžbine |
| B | Datum | datum i vreme | ponekad tekst (`12.03.`) umesto datuma |
| C | Ime i prezime | primalac | lični podatak |
| D | ADRESA* | ulica i broj | Excel ponekad pretvori adresu u broj ili datum |
| E | POŠT.KOD * | poštanski broj | broj ili tekst |
| F | MESTO * | mesto | |
| G | TELEFON* | telefon | često broj, pa je **izgubljena vodeća nula**; vratiti je pri uvozu |
| H | Total otkup | iznos u RSD, ceo broj | ponekad tekst |
| I | Proizvod | `[NR_NR0001] Naziv` | jedan proizvod po redu |
| J | količina | broj | |
| K | Napomena | slobodan tekst | retko popunjeno |
| L | KOD ZA PRAĆENJE | BEX broj pošiljke, 9 cifara | **nekad tekst umesto broja** (`ISPORUČENO`, ime drugog kurira) |
| M | SAJT | link za praćenje BEX-a ili naziv drugog kurira | drugi kuriri (npr. RAPID, BG DELIVERY, lično preuzimanje) se ne prate u MVP-u |
| N | POVRAT DATUM | tekst `POVRAT 19.01.` | ručna beleška, ne uvozi se kao status |

Pravila koja iz ovoga slede (za F02):
- **Više redova = jedna porudžbina.** Red bez kolone A je dodatni proizvod iz prethodne porudžbine, ne nova pošiljka.
- Red bez ispravnog BEX broja (9 cifara) ide u "Za ispravku" ili se preskače kao "nije BEX", nikad ne ruši uvoz.
- Status se **ne čita iz tabele** (kolone L, M, N su ručne beleške). Status dolazi samo sa BEX API-ja.

## 2. BEX specifikacija uplata otkupa (ulaz za F07)

Excel konvertovan iz PDF-a, list `Table 1`. Naziv fajla: `<račun primaoca>-<DDMMYYYY> - specifikacija.xlsx`, jedan fajl = jedna uplata (jedan datum naplate).

**Prvi red je jedna spojena ćelija sa svim nazivima kolona u jednom tekstu.** Do sada se brisao ručno. Parser ga sam preskače i kolone čita po poziciji.

| Kolona | Naziv | Sadržaj |
| --- | --- | --- |
| A | (redni broj) | 1, 2, 3… |
| B | Br. pošiljke | BEX broj, 9 cifara |
| C | D. preuzimanja | `DD.MM.YYYY.` (tekst) |
| D | D. naplate | `DD.MM.YYYY.` (tekst), isti za ceo fajl |
| E | Uplatilac | ime i mesto kupca (lični podatak) |
| F | Adresa | adresa kupca (lični podatak) |
| G | Iznos | ceo broj u RSD |
| H | Primalac otkupa | pilot firma |
| I | Adresa | adresa pilot firme |
| J | Račun | račun pilot firme, 18 cifara |
| K | Napomena klijenta | oznaka klijenta fulfillment centra (`NR`, `SF1`…) |
| L–N | Napomena interna, Iz/Za | uglavnom prazno |
| O, P | | šifre BEX centara |

Primer koji smo dobili: 116 stavki, jedan datum naplate, zbir svih stavki u koloni G.

## Odgovori vlasnika proizvoda (08.11.2026.)

- **Otkup se nikad ne isplaćuje delimično.** Jedna pošiljka = najviše jedna uplata od kurira. Ključ za duplikat uplate je `(firma, kurir, broj pošiljke)`.
- **"Nije preuzeto" nije pouzdano:** kurir nekad ne skenira paket, pa pošiljka izgleda nepreuzeto do sledećeg skeniranja. Pratimo **samo statuse sa API-ja**, bez upozorenja "Nije preuzeto" u MVP-u (F05).

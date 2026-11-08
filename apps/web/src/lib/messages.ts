/**
 * Poruke korisniku (srpski, latinica, kratko). Server Actions šalju samo ključ u URL-u
 * (?greska=... / ?poruka=...), a stranica prikazuje tekst. Tako u URL nikad ne ide lični podatak.
 */
export const ERRORS = {
  pogresna_prijava: 'Pogrešan email ili lozinka.',
  email_obavezan: 'Unesite email.',
  link_neuspeh: 'Link za prijavu nije poslat. Pokušajte ponovo za minut.',
  link_istekao: 'Link za prijavu je istekao ili je već iskorišćen. Zatražite novi.',
  mfa_kod: 'Kod nije tačan. Unesite novi kod iz aplikacije.',
  mfa_greska: 'Dvostepena prijava nije uspela. Pokušajte ponovo.',
  nema_prava: 'Za ovu radnju treba vam uloga administratora.',
  poslednji_admin: 'Firma mora da ima bar jednog aktivnog administratora.',
  poziv_postoji: 'Ova osoba je već pozvana.',
  poziv_neuspeh: 'Poziv nije sačuvan.',
  kljuc_kratak: 'API ključ je prekratak.',
  kljuc_neuspeh: 'Ključ nije sačuvan. Pokušajte ponovo.',
  lozinka_kratka: 'Lozinka mora da ima bar 8 znakova.',
  lozinka_neuspeh: 'Lozinka nije promenjena.',
  izmena_neuspeh: 'Izmena nije sačuvana.',
} as const;

export const NOTICES = {
  link_poslat: 'Poslali smo link za prijavu na vaš email. Otvorite ga u ovom browseru.',
  poziv_poslat: 'Poziv je sačuvan. Kolega se prijavljuje na stranici za prijavu sa ovim emailom.',
  poziv_obrisan: 'Poziv je povučen.',
  sacuvano: 'Sačuvano.',
  kljuc_sacuvan: 'API ključ je sačuvan.',
  mfa_ukljucen: 'Dvostepena prijava je uključena.',
  lozinka_promenjena: 'Lozinka je promenjena.',
} as const;

export type ErrorKey = keyof typeof ERRORS;
export type NoticeKey = keyof typeof NOTICES;

export function errorText(key: unknown): string | null {
  return typeof key === 'string' && key in ERRORS ? ERRORS[key as ErrorKey] : null;
}

export function noticeText(key: unknown): string | null {
  return typeof key === 'string' && key in NOTICES ? NOTICES[key as NoticeKey] : null;
}

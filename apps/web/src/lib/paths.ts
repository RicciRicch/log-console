/**
 * Bezbedna adresa za povratak posle prijave: samo putanja unutar aplikacije,
 * nikad spoljni sajt (zaštita od "open redirect").
 */
export function safeNextPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

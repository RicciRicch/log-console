// Formati iz PRODUCT.md: datum 08.11.2026., vreme 14:35, novac 1.250,00 RSD.
const TZ = 'Europe/Belgrade';

function parts(value: string | Date, options: Intl.DateTimeFormatOptions) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('sr-Latn-RS', { timeZone: TZ, ...options })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
}

/** 08.11.2026. */
export function formatDate(value: string | Date): string {
  const p = parts(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${p.day}.${p.month}.${p.year}.`;
}

/** 14:35 */
export function formatTime(value: string | Date): string {
  const p = parts(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

/** 1.250,00 RSD */
export function formatMoney(amount: number, currency = 'RSD'): string {
  const n = new Intl.NumberFormat('sr-Latn-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${n} ${currency}`;
}

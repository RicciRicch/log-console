import type { CourierEvent } from '@konzola/couriers-core';
import type { UnifiedStatus } from '@konzola/shared';
import type { BexHistoryEvent } from './schema';

/**
 * BEX `statusCode` (+ `reasonCode`) -> unified status.
 * Source: public docs + real pilot shipments, see docs/features/F03-bex-modul.md.
 * Returns `null` for codes we do not know yet.
 */
export function mapBexStatus(statusCode: number, reasonCode: number): UnifiedStatus | null {
  switch (statusCode) {
    case -21: // Evidentirano – Na proveri podataka (shows up right after registration)
    case 1: // Evidentirano
      return 'created';
    case -51: // Carina
      return 'in_transit';
    case 11: // Preuzeto; with a reason code it is a failed delivery attempt
      return reasonCode !== 0 ? 'failed_delivery' : 'in_transit';
    case 21: // Dostavljeno
      return 'delivered';
    case 25: // Vratiti pošiljaocu
      return 'returning';
    case 30: // Vraćena pošiljaocu
      return 'returned';
    default:
      return null;
  }
}

const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/;
const TIMEZONE_RE = /^(?:GMT|UTC)(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/;

/**
 * BEX sends local time without an offset plus a separate zone ("GMT+1").
 * Converts the pair to a UTC `Date`, or `null` if either part is not in the expected format.
 */
export function parseBexTimestamp(timeStamp: string, timeZone: string): Date | null {
  const t = TIMESTAMP_RE.exec(timeStamp.trim());
  const z = TIMEZONE_RE.exec(timeZone.trim());
  if (!t || !z) return null;

  const [, y, mo, d, h, mi, s] = t.map(Number) as [number, number, number, number, number, number, number];
  const sign = z[1] === '-' ? -1 : 1;
  const offsetMinutes = sign * (Number(z[2] ?? 0) * 60 + Number(z[3] ?? 0));

  const localAsUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const date = new Date(localAsUtc - offsetMinutes * 60_000);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Maps one BEX history item. Returns `null` when its time cannot be parsed. */
export function mapBexEvent(event: BexHistoryEvent): CourierEvent | null {
  const occurredAt = parseBexTimestamp(event.timeStamp, event.timeZone);
  if (!occurredAt) return null;

  return {
    rawStatus: String(event.statusCode),
    rawReason: event.reasonCode !== 0 ? String(event.reasonCode) : null,
    status: mapBexStatus(event.statusCode, event.reasonCode),
    occurredAt,
    description: event.statusName,
    location: event.statusLocation ?? null,
  };
}

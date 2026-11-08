import type { UnifiedStatus } from './status';

export interface StatusEvent {
  /** `null` when the courier sent a code we do not know yet. */
  status: UnifiedStatus | null;
  occurredAt: Date;
}

/**
 * Current status of a shipment = status of its latest event by time (ADR-009).
 *
 * - Ties on time are broken by position: the later item in `events` wins,
 *   because couriers return history in chronological order.
 * - Status may go "backwards" (e.g. delivered -> failed_delivery); that is intended.
 * - Events with an unknown status are skipped.
 */
export function pickCurrentStatus(events: readonly StatusEvent[]): UnifiedStatus | null {
  let current: UnifiedStatus | null = null;
  let currentTime = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    if (event.status === null) continue;
    const time = event.occurredAt.getTime();
    if (Number.isNaN(time)) continue;
    if (time >= currentTime) {
      current = event.status;
      currentTime = time;
    }
  }

  return current;
}

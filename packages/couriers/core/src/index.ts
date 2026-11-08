import type { UnifiedStatus } from '@konzola/shared';

/**
 * Contract between the core and courier modules (CLAUDE.md rule 2).
 * The core only knows this interface and the unified statuses from @konzola/shared.
 */

/** One status change as reported by the courier, already mapped to our status. */
export interface CourierEvent {
  /** Courier's own status code, as a string (e.g. BEX "11"). */
  rawStatus: string;
  /** Courier's reason code for exceptions (e.g. failed delivery), `null` when there is none. */
  rawReason: string | null;
  /** Unified status, `null` when the courier code is unknown (logged by the adapter). */
  status: UnifiedStatus | null;
  /** When the event happened at the courier, in UTC. */
  occurredAt: Date;
  /** Courier's human-readable description (e.g. "Preuzeto - Neuspela dostava - ..."). */
  description: string;
  location: string | null;
}

export type CourierErrorKind =
  /** The courier does not know this tracking number (or it belongs to another contract). */
  | 'not_found'
  /** Courier API failed after retries (network, timeout, 5xx, 429). Try again on the next run. */
  | 'unavailable'
  /** The courier answered with something we cannot parse. */
  | 'invalid_response';

export type CourierStatusResult =
  | {
      trackingNumber: string;
      ok: true;
      /** Full history in the courier's order (chronological). */
      events: CourierEvent[];
      /** Status of the latest event by time (ADR-009). */
      currentStatus: UnifiedStatus | null;
    }
  | {
      trackingNumber: string;
      ok: false;
      error: { kind: CourierErrorKind; message: string };
    };

/** Per-tenant credentials, read from Vault by the worker. Never log them. */
export interface CourierCredentials {
  token: string;
}

export interface GetStatusesOptions {
  signal?: AbortSignal;
}

export interface CourierAdapter {
  readonly code: string;
  /**
   * Fetches status history for many shipments.
   * One shipment failing never fails the others: it comes back as `ok: false`.
   * Throws `CourierAuthError` when the credentials are rejected, so the caller can stop for this tenant.
   * Results are in the same order as `trackingNumbers`.
   */
  getStatuses(
    trackingNumbers: readonly string[],
    creds: CourierCredentials,
    options?: GetStatusesOptions,
  ): Promise<CourierStatusResult[]>;
}

/** Credentials were rejected by the courier. Stop polling this tenant and tell its admin. */
export class CourierAuthError extends Error {
  readonly courierCode: string;

  constructor(courierCode: string, message: string) {
    super(message);
    this.name = 'CourierAuthError';
    this.courierCode = courierCode;
  }
}

export interface CourierLogger {
  warn(message: string, data?: Record<string, unknown>): void;
}

export const silentLogger: CourierLogger = { warn: () => {} };

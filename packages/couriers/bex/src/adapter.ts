import {
  CourierAuthError,
  silentLogger,
  type CourierAdapter,
  type CourierCredentials,
  type CourierEvent,
  type CourierLogger,
  type CourierStatusResult,
  type GetStatusesOptions,
} from '@konzola/couriers-core';
import { pickCurrentStatus } from '@konzola/shared';
import { mapBexEvent } from './map';
import { bexHistoryResponseSchema } from './schema';

export const BEX_CODE = 'bex';
export const BEX_HISTORY_URL = 'https://integrations.bexexpress.rs/api/Shipments/shipmentHistory';

export interface BexAdapterOptions {
  /** Injected for tests. Defaults to global `fetch`. */
  fetch?: typeof fetch;
  historyUrl?: string;
  /** Max parallel requests per `getStatuses` call. BEX has no batch endpoint and no published limit. */
  concurrency?: number;
  /** Attempts per shipment for network errors, timeouts, 429 and 5xx. */
  maxAttempts?: number;
  /** Backoff before attempt n is `retryBaseDelayMs * 2^(n-2)`. */
  retryBaseDelayMs?: number;
  timeoutMs?: number;
  logger?: CourierLogger;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createBexAdapter(options: BexAdapterOptions = {}): CourierAdapter {
  const doFetch = options.fetch ?? globalThis.fetch;
  const historyUrl = options.historyUrl ?? BEX_HISTORY_URL;
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 1_000;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const logger = options.logger ?? silentLogger;
  const sleep = options.sleep ?? defaultSleep;

  async function fetchOne(
    trackingNumber: string,
    creds: CourierCredentials,
    signal: AbortSignal | undefined,
  ): Promise<CourierStatusResult> {
    const url = `${historyUrl}?trackingValue=${encodeURIComponent(trackingNumber)}`;
    let lastProblem = 'no attempt made';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) await sleep(retryBaseDelayMs * 2 ** (attempt - 2));
      signal?.throwIfAborted();

      let res: Response;
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        res = await doFetch(url, {
          headers: { 'X-AUTH-TOKEN': creds.token, Accept: 'application/json' },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
      } catch (err) {
        signal?.throwIfAborted();
        lastProblem = `network error: ${err instanceof Error ? err.message : String(err)}`;
        continue;
      }

      if (res.status === 401) {
        throw new CourierAuthError(BEX_CODE, 'BEX rejected the API token (401).');
      }
      if (res.status === 429 || res.status >= 500) {
        lastProblem = `HTTP ${res.status}`;
        continue;
      }
      if (res.status === 400) {
        // BEX answers 400 (not 404) for an unknown tracking number.
        return fail(trackingNumber, 'not_found', await readMessage(res));
      }
      if (!res.ok) {
        return fail(trackingNumber, 'unavailable', `HTTP ${res.status}: ${await readMessage(res)}`);
      }

      return parseHistory(trackingNumber, res);
    }

    return fail(
      trackingNumber,
      'unavailable',
      `gave up after ${maxAttempts} attempts (${lastProblem})`,
    );
  }

  async function parseHistory(trackingNumber: string, res: Response): Promise<CourierStatusResult> {
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return fail(trackingNumber, 'invalid_response', 'response is not JSON');
    }

    const parsed = bexHistoryResponseSchema.safeParse(json);
    if (!parsed.success) {
      return fail(trackingNumber, 'invalid_response', `unexpected shape: ${parsed.error.message}`);
    }

    const events: CourierEvent[] = [];
    for (const raw of parsed.data.listShipmentHistory) {
      const event = mapBexEvent(raw);
      if (!event) {
        return fail(
          trackingNumber,
          'invalid_response',
          `cannot parse time "${raw.timeStamp}" "${raw.timeZone}"`,
        );
      }
      if (event.status === null) {
        logger.warn('bex: unknown status code', {
          trackingNumber,
          statusCode: raw.statusCode,
          reasonCode: raw.reasonCode,
          statusName: raw.statusName,
        });
      }
      events.push(event);
    }

    return { trackingNumber, ok: true, events, currentStatus: pickCurrentStatus(events) };
  }

  return {
    code: BEX_CODE,

    async getStatuses(
      trackingNumbers: readonly string[],
      creds: CourierCredentials,
      callOptions: GetStatusesOptions = {},
    ): Promise<CourierStatusResult[]> {
      const results = new Array<CourierStatusResult>(trackingNumbers.length);
      let next = 0;
      let authError: CourierAuthError | null = null;

      async function worker() {
        while (authError === null && next < trackingNumbers.length) {
          const index = next++;
          const trackingNumber = trackingNumbers[index]!;
          try {
            results[index] = await fetchOne(trackingNumber, creds, callOptions.signal);
          } catch (err) {
            if (err instanceof CourierAuthError) {
              authError = err;
              return;
            }
            throw err;
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(concurrency, trackingNumbers.length) }, worker),
      );
      if (authError) throw authError;
      return results;
    },
  };
}

function fail(
  trackingNumber: string,
  kind: 'not_found' | 'unavailable' | 'invalid_response',
  message: string,
): CourierStatusResult {
  return { trackingNumber, ok: false, error: { kind, message } };
}

async function readMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text) as { message?: unknown };
    if (typeof body.message === 'string') return body.message;
  } catch {
    // not JSON
  }
  return text.slice(0, 200);
}

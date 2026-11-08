import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'shipment-history');

export interface FakeResponse {
  status: number;
  body: unknown;
}

/** Fixture files store `{ status, body }` exactly as BEX answered (with fake recipient data). */
export function loadFixture(name: string): FakeResponse {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as FakeResponse;
}

export interface FetchCall {
  trackingNumber: string;
  headers: Record<string, string>;
}

/**
 * Fake `fetch` that answers per tracking number.
 * A handler may be a response, or a function of the attempt number (1-based), or throw to simulate a network error.
 */
export function fakeFetch(
  handlers: Record<string, FakeResponse | ((attempt: number) => FakeResponse | Promise<FakeResponse>)>,
) {
  const calls: FetchCall[] = [];
  const attempts = new Map<string, number>();

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const trackingNumber = url.searchParams.get('trackingValue') ?? '';
    calls.push({ trackingNumber, headers: { ...(init?.headers as Record<string, string>) } });

    const attempt = (attempts.get(trackingNumber) ?? 0) + 1;
    attempts.set(trackingNumber, attempt);

    const handler = handlers[trackingNumber];
    if (!handler) throw new Error(`no fake response for ${trackingNumber}`);
    const { status, body } = typeof handler === 'function' ? await handler(attempt) : handler;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  return { fetch: fetchImpl, calls };
}

export const noSleep = async () => {};

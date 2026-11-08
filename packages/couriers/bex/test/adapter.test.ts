import { CourierAuthError } from '@konzola/couriers-core';
import { describe, expect, it, vi } from 'vitest';
import { createBexAdapter } from '../src';
import { fakeFetch, loadFixture, noSleep, type FakeResponse } from './helpers';

const creds = { token: 'secret-token-123' };
const delivered = loadFixture('delivered');
const notFound = loadFixture('not-found');
const unauthorized = loadFixture('unauthorized');

describe('createBexAdapter', () => {
  it('sends the token in X-AUTH-TOKEN and keeps result order', async () => {
    const { fetch, calls } = fakeFetch({ A: delivered, B: notFound, C: delivered });
    const results = await createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['A', 'B', 'C'], creds);

    expect(results.map((r) => [r.trackingNumber, r.ok])).toEqual([
      ['A', true],
      ['B', false],
      ['C', true],
    ]);
    expect(calls.every((c) => c.headers['X-AUTH-TOKEN'] === 'secret-token-123')).toBe(true);
  });

  it('one bad shipment does not fail the others', async () => {
    const { fetch } = fakeFetch({
      A: delivered,
      B: { status: 200, body: { unexpected: true } },
      C: notFound,
      D: delivered,
    });
    const results = await createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['A', 'B', 'C', 'D'], creds);

    expect(results.map((r) => (r.ok ? 'ok' : r.error.kind))).toEqual(['ok', 'invalid_response', 'not_found', 'ok']);
  });

  it('never runs more than `concurrency` requests at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const slow = async (): Promise<FakeResponse> => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return delivered;
    };
    const numbers = Array.from({ length: 10 }, (_, i) => `N${i}`);
    const { fetch } = fakeFetch(Object.fromEntries(numbers.map((n) => [n, slow])));

    const results = await createBexAdapter({ fetch, sleep: noSleep, concurrency: 3 }).getStatuses(numbers, creds);

    expect(results.every((r) => r.ok)).toBe(true);
    expect(maxInFlight).toBe(3);
  });

  it('retries 503 with growing backoff and succeeds', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const { fetch, calls } = fakeFetch({
      A: (attempt) => (attempt < 3 ? { status: 503, body: 'down' } : delivered),
    });
    const [result] = await createBexAdapter({ fetch, sleep, retryBaseDelayMs: 100 }).getStatuses(['A'], creds);

    expect(result?.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200]);
  });

  it('retries 429 and network errors, then gives up as unavailable', async () => {
    const { fetch, calls } = fakeFetch({
      A: (attempt) => {
        if (attempt === 1) throw new Error('ECONNRESET');
        return { status: 429, body: 'slow down' };
      },
    });
    const [result] = await createBexAdapter({ fetch, sleep: noSleep, maxAttempts: 3 }).getStatuses(['A'], creds);

    expect(calls).toHaveLength(3);
    expect(result).toMatchObject({ ok: false, error: { kind: 'unavailable' } });
  });

  it('does not retry 400', async () => {
    const { fetch, calls } = fakeFetch({ A: notFound });
    await createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['A'], creds);
    expect(calls).toHaveLength(1);
  });

  it('401 throws CourierAuthError and stops sending requests', async () => {
    const numbers = Array.from({ length: 10 }, (_, i) => `N${i}`);
    const { fetch, calls } = fakeFetch(Object.fromEntries(numbers.map((n) => [n, unauthorized])));

    await expect(
      createBexAdapter({ fetch, sleep: noSleep, concurrency: 2 }).getStatuses(numbers, creds),
    ).rejects.toBeInstanceOf(CourierAuthError);
    expect(calls.length).toBeLessThanOrEqual(2);
  });

  it('logs unknown status codes, keeps the event, and ignores it for the current status', async () => {
    const warn = vi.fn();
    const body = structuredClone(delivered.body) as { listShipmentHistory: Record<string, unknown>[] };
    body.listShipmentHistory.push({
      ...body.listShipmentHistory.at(-1),
      statusCode: 99,
      statusName: 'Nešto novo',
      timeStamp: '2026-01-07T10:00:00',
    });
    const { fetch } = fakeFetch({ A: { status: 200, body } });

    const [result] = await createBexAdapter({ fetch, sleep: noSleep, logger: { warn } }).getStatuses(['A'], creds);

    if (!result?.ok) throw new Error('expected ok');
    expect(result.events.at(-1)).toMatchObject({ rawStatus: '99', status: null });
    expect(result.currentStatus).toBe('delivered');
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(creds.token);
  });

  it('unparseable event time makes the shipment invalid_response', async () => {
    const body = structuredClone(delivered.body) as { listShipmentHistory: Record<string, unknown>[] };
    body.listShipmentHistory[0]!.timeZone = 'Europe/Belgrade';
    const { fetch } = fakeFetch({ A: { status: 200, body } });

    const [result] = await createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['A'], creds);
    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid_response' } });
  });

  it('returns an empty list for no tracking numbers without calling BEX', async () => {
    const { fetch, calls } = fakeFetch({});
    expect(await createBexAdapter({ fetch }).getStatuses([], creds)).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const { fetch } = fakeFetch({ A: delivered });
    await expect(
      createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['A'], creds, { signal: controller.signal }),
    ).rejects.toThrow();
  });
});

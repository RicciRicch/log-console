import { CourierAuthError, type CourierStatusResult } from '@konzola/couriers-core';
import { pickCurrentStatus } from '@konzola/shared';
import { describe, expect, it } from 'vitest';
import { createBexAdapter } from '../src';
import { fakeFetch, loadFixture, noSleep } from './helpers';

const creds = { token: 'test-token' };

async function run(fixture: string): Promise<CourierStatusResult> {
  const { fetch } = fakeFetch({ X: loadFixture(fixture) });
  const [result] = await createBexAdapter({ fetch, sleep: noSleep }).getStatuses(['X'], creds);
  return result!;
}

function okResult(result: CourierStatusResult) {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.kind}: ${result.error.message}`);
  return result;
}

const failedAttempts = (result: CourierStatusResult) =>
  okResult(result).events.filter((e) => e.status === 'failed_delivery').length;

// Real event sequences from pilot shipments (recipient data replaced), see docs/features/F03-bex-modul.md.
describe('BEX fixtures', () => {
  it('delivered: 1 -> 11 -> 21', async () => {
    const result = okResult(await run('delivered'));
    expect(result.events.map((e) => e.status)).toEqual(['created', 'in_transit', 'delivered']);
    expect(result.currentStatus).toBe('delivered');
    expect(failedAttempts(result)).toBe(0);
  });

  it('failed-then-delivered: -21 maps to created, one failed attempt with reason 145', async () => {
    const result = okResult(await run('failed-then-delivered'));
    expect(result.events.map((e) => e.rawStatus)).toEqual(['1', '-21', '1', '11', '11', '21']);
    expect(result.events.slice(0, 3).every((e) => e.status === 'created')).toBe(true);
    const failed = result.events.filter((e) => e.status === 'failed_delivery');
    expect(failed).toHaveLength(1);
    expect(failed[0]?.rawReason).toBe('145');
    expect(failed[0]?.description).toContain('Ne javlja se na telefon');
    expect(result.currentStatus).toBe('delivered');
  });

  it('failed-parcel-shop: reason 392', async () => {
    const result = okResult(await run('failed-parcel-shop'));
    expect(result.events.find((e) => e.status === 'failed_delivery')?.rawReason).toBe('392');
    expect(result.currentStatus).toBe('delivered');
  });

  it('delivered-then-reverted: "Dostavljeno" is corrected, status goes back (ADR-009)', async () => {
    const result = okResult(await run('delivered-then-reverted'));
    expect(result.events.map((e) => e.status)).toEqual([
      'created',
      'in_transit',
      'delivered',
      'failed_delivery',
      'delivered',
    ]);
    // Polled between the correction and the final delivery, the shipment must show the failed attempt.
    expect(pickCurrentStatus(result.events.slice(0, 4))).toBe('failed_delivery');
    expect(result.currentStatus).toBe('delivered');
    expect(failedAttempts(result)).toBe(1);
  });

  it('return-cancelled: return to sender is undone and the parcel is delivered', async () => {
    const result = okResult(await run('return-cancelled'));
    const statuses = result.events.map((e) => e.status);
    expect(statuses).toContain('returning');
    expect(pickCurrentStatus(result.events.slice(0, statuses.indexOf('returning') + 1))).toBe('returning');
    expect(result.currentStatus).toBe('delivered');
    expect(failedAttempts(result)).toBe(1);
  });

  it('all events have UTC times in chronological order', async () => {
    for (const name of ['delivered', 'failed-then-delivered', 'failed-parcel-shop', 'delivered-then-reverted', 'return-cancelled']) {
      const times = okResult(await run(name)).events.map((e) => e.occurredAt.getTime());
      expect(times, name).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it('not-found: 400 becomes not_found', async () => {
    const result = await run('not-found');
    expect(result).toMatchObject({ ok: false, error: { kind: 'not_found' } });
    if (!result.ok) expect(result.error.message).toContain("doesn't exist");
  });

  it('unauthorized: 401 throws CourierAuthError', async () => {
    await expect(run('unauthorized')).rejects.toBeInstanceOf(CourierAuthError);
  });
});

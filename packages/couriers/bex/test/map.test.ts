import { describe, expect, it } from 'vitest';
import { mapBexEvent, mapBexStatus, parseBexTimestamp } from '../src';

describe('mapBexStatus', () => {
  it.each([
    [-21, 0, 'created'],
    [1, 0, 'created'],
    [-51, 0, 'in_transit'],
    [11, 0, 'in_transit'],
    [11, 145, 'failed_delivery'],
    [11, 156, 'failed_delivery'],
    [11, 392, 'failed_delivery'],
    [21, 0, 'delivered'],
    [25, 0, 'returning'],
    [30, 0, 'returned'],
  ] as const)('statusCode %i, reasonCode %i -> %s', (statusCode, reasonCode, expected) => {
    expect(mapBexStatus(statusCode, reasonCode)).toBe(expected);
  });

  it('returns null for unknown codes', () => {
    expect(mapBexStatus(99, 0)).toBeNull();
  });
});

describe('parseBexTimestamp', () => {
  it('applies GMT+1 (winter)', () => {
    expect(parseBexTimestamp('2026-01-05T09:46:42', 'GMT+1')?.toISOString()).toBe(
      '2026-01-05T08:46:42.000Z',
    );
  });

  it('applies GMT+2 (summer)', () => {
    expect(parseBexTimestamp('2025-08-07T11:54:50', 'GMT+2')?.toISOString()).toBe(
      '2025-08-07T09:54:50.000Z',
    );
  });

  it('handles day rollover', () => {
    expect(parseBexTimestamp('2026-01-01T00:30:00', 'GMT+1')?.toISOString()).toBe(
      '2025-12-31T23:30:00.000Z',
    );
  });

  it('accepts fractional seconds, "GMT" and "UTC+01:00"', () => {
    expect(parseBexTimestamp('2026-01-05T09:46:42.123', 'GMT')?.toISOString()).toBe(
      '2026-01-05T09:46:42.000Z',
    );
    expect(parseBexTimestamp('2026-01-05T09:46:42', 'UTC+01:00')?.toISOString()).toBe(
      '2026-01-05T08:46:42.000Z',
    );
  });

  it.each([
    ['05.01.2026 09:46', 'GMT+1'],
    ['2026-01-05T09:46:42', 'Europe/Belgrade'],
    ['', ''],
  ])('returns null for %j %j', (timeStamp, timeZone) => {
    expect(parseBexTimestamp(timeStamp, timeZone)).toBeNull();
  });
});

describe('mapBexEvent', () => {
  it('keeps raw codes and turns reasonCode 0 into null', () => {
    const event = mapBexEvent({
      statusCode: 11,
      scanCode: 15,
      reasonCode: 0,
      statusName: 'Preuzeto - Popis magacina',
      statusLocation: 'Test mesto',
      timeStamp: '2026-01-05T16:35:35',
      timeZone: 'GMT+1',
    });
    expect(event).toEqual({
      rawStatus: '11',
      rawReason: null,
      status: 'in_transit',
      occurredAt: new Date('2026-01-05T15:35:35Z'),
      description: 'Preuzeto - Popis magacina',
      location: 'Test mesto',
    });
  });

  it('keeps the reason for a failed delivery', () => {
    const event = mapBexEvent({
      statusCode: 11,
      scanCode: 100,
      reasonCode: 145,
      statusName: 'Preuzeto - Neuspela dostava - Bio na adresi - Ne javlja se na telefon',
      statusLocation: null,
      timeStamp: '2026-01-13T09:40:39',
      timeZone: 'GMT+1',
    });
    expect(event?.status).toBe('failed_delivery');
    expect(event?.rawReason).toBe('145');
    expect(event?.location).toBeNull();
  });
});

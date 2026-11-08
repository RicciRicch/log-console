import { describe, expect, it } from 'vitest';
import { pickCurrentStatus, type StatusEvent } from '../src';

const at = (iso: string) => new Date(iso);

describe('pickCurrentStatus (ADR-009)', () => {
  it('returns null for no events', () => {
    expect(pickCurrentStatus([])).toBeNull();
  });

  it('takes the latest event by time, not the "furthest" status', () => {
    const events: StatusEvent[] = [
      { status: 'created', occurredAt: at('2026-01-09T10:00:00Z') },
      { status: 'delivered', occurredAt: at('2026-01-09T12:00:00Z') },
      { status: 'failed_delivery', occurredAt: at('2026-01-09T12:07:00Z') },
    ];
    expect(pickCurrentStatus(events)).toBe('failed_delivery');
  });

  it('does not depend on array order when times differ', () => {
    const events: StatusEvent[] = [
      { status: 'in_transit', occurredAt: at('2026-01-09T12:00:00Z') },
      { status: 'created', occurredAt: at('2026-01-09T10:00:00Z') },
    ];
    expect(pickCurrentStatus(events)).toBe('in_transit');
  });

  it('breaks ties on time by position (later item wins)', () => {
    const t = at('2026-01-05T08:46:43Z');
    expect(
      pickCurrentStatus([
        { status: 'in_transit', occurredAt: t },
        { status: 'created', occurredAt: t },
      ]),
    ).toBe('created');
  });

  it('skips events with unknown status', () => {
    expect(
      pickCurrentStatus([
        { status: 'in_transit', occurredAt: at('2026-01-09T10:00:00Z') },
        { status: null, occurredAt: at('2026-01-09T11:00:00Z') },
      ]),
    ).toBe('in_transit');
  });
});

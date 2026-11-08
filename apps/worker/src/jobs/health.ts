import type { Logger } from '../log';

export interface HealthResult {
  ok: true;
  checkedAt: string;
}

/** Probni posao: dokazuje da worker radi i da raspored (cron) okida poslove. */
export async function runHealth(
  log: Logger,
  now: () => Date = () => new Date(),
): Promise<HealthResult> {
  const checkedAt = now().toISOString();
  log.info('health: worker radi', { checkedAt });
  return { ok: true, checkedAt };
}

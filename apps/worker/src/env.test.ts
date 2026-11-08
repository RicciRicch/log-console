import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';
import { runHealth } from './jobs/health';
import { createLogger } from './log';

describe('parseEnv', () => {
  it('prihvata ispravna podešavanja i dodaje podrazumevane vrednosti', () => {
    const env = parseEnv({ DATABASE_URL: 'postgresql://user:pass@localhost:5432/postgres' });
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.HEALTH_CRON).toBe('*/15 * * * *');
  });

  it('javlja jasnu grešku kad nema DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('nikad ne ispisuje vrednost tajne u grešci', () => {
    const secret = 'mysql://user:tajna-lozinka@host/db';
    expect(() => parseEnv({ DATABASE_URL: secret })).toThrow();
    try {
      parseEnv({ DATABASE_URL: secret });
    } catch (error) {
      expect(String(error)).not.toContain('tajna-lozinka');
    }
  });
});

describe('runHealth', () => {
  it('vraća ok i vreme provere', async () => {
    const result = await runHealth(createLogger('error'), () => new Date('2026-11-08T20:00:00Z'));
    expect(result).toEqual({ ok: true, checkedAt: '2026-11-08T20:00:00.000Z' });
  });
});

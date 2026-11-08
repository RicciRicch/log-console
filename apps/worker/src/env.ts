import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Podešavanja worker-a. Tajne (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY) postoje samo ovde,
 * nikad u apps/web (CLAUDE.md, pravilo 3). Lokalno se čitaju iz root .env fajla.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string({ message: 'Nedostaje DATABASE_URL (vidi apps/worker/.env.example)' })
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL mora da počne sa postgresql://'),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Cron za probni posao; podrazumevano na svakih 15 minuta. */
  HEALTH_CRON: z.string().default('*/15 * * * *'),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): WorkerEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Poruka sme da kaže koje polje fali, ali nikad vrednost
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Loša podešavanja worker-a: ${problems}`);
  }
  return result.data;
}

/** Lokalni razvoj: učitaj root .env ako postoji (na serveru promenljive daje Railway). */
export function loadLocalEnvFile(): void {
  const file = resolve(import.meta.dirname, '../../../.env');
  if (process.env.NODE_ENV !== 'production' && existsSync(file)) {
    process.loadEnvFile(file);
  }
}

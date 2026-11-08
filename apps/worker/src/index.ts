import { PgBoss } from 'pg-boss';
import { loadLocalEnvFile, parseEnv } from './env';
import { runHealth } from './jobs/health';
import { createLogger } from './log';
import { QUEUES } from './queues';

loadLocalEnvFile();
const env = parseEnv(process.env);
const log = createLogger(env.LOG_LEVEL);

// pg-boss drži redove poslova u istoj bazi, u šemi `pgboss` (ADR-004)
const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: 'pgboss',
  application_name: 'konzola-worker',
});

boss.on('error', (error) => {
  log.error('pg-boss greška', { error: error instanceof Error ? error.message : String(error) });
});

async function main() {
  await boss.start();

  await boss.createQueue(QUEUES.health);
  await boss.schedule(QUEUES.health, env.HEALTH_CRON);
  await boss.work(QUEUES.health, async () => runHealth(log));

  log.info('worker pokrenut', { queues: Object.values(QUEUES), healthCron: env.HEALTH_CRON });
}

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log.info('worker se gasi', { signal });
  // sačekaj da započeti poslovi završe (do 30 s), pa zatvori vezu sa bazom
  await boss.stop({ graceful: true, timeout: 30_000 });
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((error: unknown) => {
  log.error('worker nije mogao da se pokrene', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

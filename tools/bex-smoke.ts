// Ručna provera BEX adaptera nad pravim API-jem. Nije test, ne ide u CI.
// Upotreba: pnpm dlx tsx tools/bex-smoke.ts <broj> [...]
// Token se čita iz BEX_API_TOKEN (okruženje ili .env u root-u) i ne ispisuje se.
import { readFileSync } from 'node:fs';
import { createBexAdapter } from '../packages/couriers/bex/src';

function token(): string {
  if (process.env.BEX_API_TOKEN) return process.env.BEX_API_TOKEN.trim();
  const line = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('BEX_API_TOKEN='));
  if (!line) throw new Error('BEX_API_TOKEN nije postavljen');
  return line
    .slice('BEX_API_TOKEN='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
}

const numbers = process.argv.slice(2);
const adapter = createBexAdapter({ logger: { warn: (m, d) => console.warn(m, d) } });
const results = await adapter.getStatuses(numbers, { token: token() });

for (const r of results) {
  if (!r.ok) {
    console.log(r.trackingNumber, 'GREŠKA', r.error.kind, r.error.message);
    continue;
  }
  console.log(r.trackingNumber, '->', r.currentStatus);
  for (const e of r.events) {
    console.log(
      '   ',
      e.occurredAt.toISOString(),
      e.rawStatus,
      e.rawReason ?? '-',
      e.status,
      '|',
      e.description,
    );
  }
}

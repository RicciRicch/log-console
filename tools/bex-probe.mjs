#!/usr/bin/env node
// Snima sirove odgovore BEX shipmentHistory endpoint-a za zadate brojeve pošiljki.
// Služi samo za istraživanje (F03). Nije deo aplikacije.
//
// Upotreba:
//   node tools/bex-probe.mjs 255658625 255658626 ...
//
// Token se čita iz BEX_API_TOKEN (okruženje ili .env u root-u repoa) i nikad se ne ispisuje.
// Odgovori idu u tools/bex-probe/out/ (u .gitignore), jer sadrže podatke primalaca.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'tools', 'bex-probe', 'out');
const ENDPOINT = 'https://integrations.bexexpress.rs/api/Shipments/shipmentHistory';
const DELAY_MS = 500; // limit nije poznat, idemo polako i redom

async function loadToken() {
  if (process.env.BEX_API_TOKEN) return process.env.BEX_API_TOKEN.trim();
  try {
    const env = await readFile(join(ROOT, '.env'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.startsWith('BEX_API_TOKEN='));
    if (line) return line.slice('BEX_API_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    // nema .env, javljamo ispod
  }
  return null;
}

function summarize(body) {
  const list = Array.isArray(body?.listShipmentHistory) ? body.listShipmentHistory : [];
  const events = list.map(
    (e) => `${e.timeStamp ?? '?'} status=${e.statusCode} reason=${e.reasonCode} scan=${e.scanCode} ${e.statusName ?? ''}`,
  );
  return { count: list.length, events };
}

async function probe(token, trackingNumber) {
  const url = `${ENDPOINT}?trackingValue=${encodeURIComponent(trackingNumber)}`;
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      headers: { 'X-AUTH-TOKEN': token, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return { trackingNumber, ok: false, error: String(err?.message ?? err) };
  }
  const ms = Date.now() - started;
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // nije JSON, čuvamo sirov tekst
  }
  const headers = Object.fromEntries(
    [...res.headers].filter(([k]) => /rate|limit|retry|content-type|date/i.test(k)),
  );
  await writeFile(
    join(OUT_DIR, `${trackingNumber}.json`),
    JSON.stringify({ trackingNumber, status: res.status, ms, headers, body: body ?? text }, null, 2),
  );
  return { trackingNumber, ok: res.ok, status: res.status, ms, ...(body ? summarize(body) : { raw: text.slice(0, 200) }) };
}

const numbers = process.argv.slice(2);
if (numbers.length === 0) {
  console.error('Upotreba: node tools/bex-probe.mjs <broj-pošiljke> [...]');
  process.exit(1);
}
const token = await loadToken();
if (!token) {
  console.error('BEX_API_TOKEN nije postavljen (okruženje ili .env u root-u repoa).');
  process.exit(1);
}
await mkdir(OUT_DIR, { recursive: true });

for (const [i, n] of numbers.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
  const r = await probe(token, n);
  // Greška jednog broja ne zaustavlja ostale.
  console.log(JSON.stringify(r, null, 2));
}
console.log(`\nSirovi odgovori: ${OUT_DIR}`);

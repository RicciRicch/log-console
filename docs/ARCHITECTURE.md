# Arhitektura

## Stack

| Deo | Tehnologija |
| --- | --- |
| Frontend | Next.js (App Router) + TypeScript, Tailwind, TanStack Table, `@supabase/ssr` |
| Baza i auth | Supabase (Postgres, Auth, RLS, Vault), EU region |
| Worker | Node + TypeScript, pg-boss (redovi poslova u Postgresu) |
| Validacija | zod (deli se između web-a i worker-a) |
| Testovi | Vitest, pgTAP ili SQL testovi za RLS, Playwright kasnije |
| Deploy | Web: Vercel. Worker: Railway ili Fly.io. CI: GitHub Actions |

## Struktura repoa

```
apps/
  web/          # Next.js aplikacija
  worker/       # pozadinski poslovi
packages/
  shared/       # tipovi, UnifiedStatus, zod šeme
  couriers/
    core/       # CourierAdapter interfejs (uvozi UnifiedStatus iz shared)
    bex/        # BEX implementacija
supabase/
  migrations/
  seed.sql
docs/
```

## Slojevi

1. **Ulaz:** uvoz fajla ili Google Sheet-a, ručni unos.
2. **Jezgro:** baza + poslovna pravila (statusi, upozorenja, otkupi). Ne zna detalje nijednog kurira.
3. **Kurirski moduli:** pričaju sa API-jem kurira i prevode njegove statuse u naše.
4. **Izlazi:** web aplikacija, Google Sheet, PDF/Excel specifikacije.

## Interfejs kurira

Kod je u `packages/couriers/core/src/index.ts`, ovo je sažetak.

```ts
// @konzola/shared
type UnifiedStatus =
  | 'created' | 'in_transit' | 'failed_delivery'
  | 'delivered' | 'returning' | 'returned';
function pickCurrentStatus(events): UnifiedStatus | null; // ADR-009

// @konzola/couriers-core
interface CourierEvent {
  rawStatus: string;          // šifra kurira, npr. BEX "11"
  rawReason: string | null;   // razlog izuzetka, npr. BEX reasonCode "145"
  status: UnifiedStatus | null; // null = nepoznata šifra (adapter je loguje)
  occurredAt: Date;           // UTC
  description: string;
  location: string | null;
}

type CourierStatusResult =
  | { trackingNumber; ok: true; events: CourierEvent[]; currentStatus: UnifiedStatus | null }
  | { trackingNumber; ok: false; error: { kind: 'not_found' | 'unavailable' | 'invalid_response'; message } };

interface CourierAdapter {
  code: string;
  getStatuses(trackingNumbers, creds: { token }, options?: { signal }): Promise<CourierStatusResult[]>;
  // kasnije: createShipments, getLabels, getCodPayments
}

class CourierAuthError extends Error {} // loš ključ: worker zaustavlja posao za tu firmu
```

- Jedinstveni statusi žive u `packages/shared`, jer ih koriste i jezgro i web, a oni ne smeju da zavise od kurirskih paketa.
- Adapter vraća događaje koji su već mapirani, pa jezgro nikad ne vidi šifre kurira osim kao `rawStatus`/`rawReason` za čuvanje u `shipment_events`.
- Greška jedne pošiljke dolazi kao `ok: false`, a ne kao izuzetak. Izuzetak je samo `CourierAuthError`.
- Paketi su čist TypeScript bez build koraka (`exports` pokazuje na `src/index.ts`). Worker i Next.js ih transpiluju sami.

## Model podataka (skica)

| Tabela | Ključne kolone |
| --- | --- |
| `tenants` | id, name, created_at |
| `tenant_settings` | tenant_id, stuck_after_days (podrazumevano 3), pickup_cutoff_time, timezone |
| `memberships` | tenant_id, user_id, role (`admin`, `operator`) |
| `courier_accounts` | tenant_id, courier_code, vault_secret_id, secret_last4, is_default |
| `import_mappings` | tenant_id, source, column_map (jsonb) |
| `imports` | tenant_id, source, status, rows_ok, rows_error |
| `shipments` | tenant_id, courier_code, tracking_number, recipient_*, cod_amount, status, last_status_at, is_final |
| `shipment_events` | tenant_id, shipment_id, raw_status, raw_reason, status, occurred_at, recorded_at |
| `alerts` | tenant_id, shipment_id, type, resolved_at |
| `cod_payments` | tenant_id, courier_code, tracking_number, amount, paid_on, import_id, shipment_id (null dok nije spareno), match_error |
| `cod_items` | tenant_id, shipment_id, amount, phase, courier_paid_at, payout_id |
| `payouts` | tenant_id, created_by, total, file_url, created_at |
| `sheet_connections` | tenant_id, spreadsheet_id, sheet_name, tracking_column, status_column, auth_type, last_error |
| `audit_log` | tenant_id, user_id, action, entity, entity_id, data |

Unique ključevi (zaštita od duplikata pri ponovnom pokretanju):

- `shipments`: `(tenant_id, courier_code, tracking_number)`, da ponovni uvoz ne pravi duplikate.
- `shipment_events`: `(shipment_id, raw_status, raw_reason, occurred_at)` sa `NULLS NOT DISTINCT`. Događaj se upisuje i kad se promeni samo sirovi status ili razlog, ne samo jedinstveni status (vidi F04).
- `cod_payments`: `(tenant_id, courier_code, tracking_number, paid_on, amount)`, da isti izveštaj uvezen dva puta ne duplira uplate. Konačan ključ zavisi od izgleda BEX izveštaja i od toga da li postoje delimične uplate (otvoreno pitanje u F07).

## Poslovi u worker-u

| Posao | Kada | Šta radi |
| --- | --- | --- |
| `poll-statuses` | svaki sat | Za svaku firmu i kurira uzme pošiljke gde `is_final = false`, pita API u batch-evima, upiše nove događaje |
| `evaluate-alerts` | posle polling-a | Pravi i zatvara upozorenja |
| `process-import` | na zahtev | Parsira fajl/Sheet, validira, upisuje pošiljke |
| `match-cod-payments` | na zahtev | Sparuje izveštaj o uplatama sa pošiljkama |
| `sync-google-sheet` | posle promene statusa | Upisuje statuse i boje nazad u Sheet |

## Bezbednost

- RLS na svakoj tabeli, politika preko `memberships`.
- API ključevi kurira samo u Vault-u, čita ih samo worker. Web ih upisuje preko funkcije `set_courier_secret` (ADR-008), bez `service_role` ključa.
- Uloge se proveravaju i u bazi (RLS), ne samo u UI-ju.
- Audit log za sve što dira novac (isplate, izmena otkupa).
- MFA za administratore, PITR backup u Supabase-u.

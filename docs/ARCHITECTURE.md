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
  shared/       # tipovi, statusi, zod šeme
  couriers/
    core/       # CourierAdapter interfejs
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

## Interfejs kurira (skica)

```ts
interface CourierAdapter {
  code: 'bex' | string;
  getStatuses(trackingNumbers: string[], creds: CourierCredentials): Promise<CourierStatus[]>;
  mapStatus(raw: CourierStatus): UnifiedStatus;
  // kasnije: createShipments, getLabels, getCodPayments
}

type UnifiedStatus =
  | 'created' | 'in_transit' | 'failed_delivery'
  | 'delivered' | 'returning' | 'returned';
```

## Model podataka (skica)

| Tabela | Ključne kolone |
| --- | --- |
| `tenants` | id, name, created_at |
| `memberships` | tenant_id, user_id, role (`admin`, `operator`) |
| `courier_accounts` | tenant_id, courier_code, vault_secret_id, is_default |
| `import_mappings` | tenant_id, source, column_map (jsonb) |
| `imports` | tenant_id, source, status, rows_ok, rows_error |
| `shipments` | tenant_id, courier_code, tracking_number, recipient_*, cod_amount, status, last_status_at, is_final |
| `shipment_events` | tenant_id, shipment_id, raw_status, status, occurred_at |
| `alerts` | tenant_id, shipment_id, type, resolved_at |
| `cod_items` | tenant_id, shipment_id, amount, phase, courier_paid_at, payout_id |
| `payouts` | tenant_id, created_by, total, file_url, created_at |
| `audit_log` | tenant_id, user_id, action, entity, entity_id, data |

Unique: `(tenant_id, courier_code, tracking_number)` na `shipments`, da ponovni uvoz ne pravi duplikate.

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
- API ključevi kurira samo u Vault-u, čita ih samo worker.
- Uloge se proveravaju i u bazi (RLS), ne samo u UI-ju.
- Audit log za sve što dira novac (isplate, izmena otkupa).
- MFA za administratore, PITR backup u Supabase-u.

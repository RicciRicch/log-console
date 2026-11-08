import { ui } from '@/components/ui';
import { requireTenant } from '@/lib/tenant';

// Početna: kratak pregled. Lista pošiljki (F06) dolazi od Duleta.
export default async function HomePage() {
  const { supabase, tenant } = await requireTenant();

  const count = async (build: () => PromiseLike<{ count: number | null }>) =>
    (await build()).count ?? 0;
  const [active, alerts, awaitingPayout] = await Promise.all([
    count(() =>
      supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('is_final', false),
    ),
    count(() =>
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .is('resolved_at', null),
    ),
    count(() =>
      supabase
        .from('cod_items')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('phase', 'paid_by_courier'),
    ),
  ]);

  const tiles = [
    { label: 'Aktivne pošiljke', value: active },
    { label: 'Otvorena upozorenja', value: alerts },
    { label: 'Otkupi spremni za isplatu', value: awaitingPayout },
  ];

  return (
    <>
      <h1 className={ui.h1}>{tenant.tenantName}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className={ui.card}>
            <p className={ui.muted}>{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {t.value.toLocaleString('sr-RS')}
            </p>
          </div>
        ))}
      </div>
      <p className={ui.muted}>Lista pošiljki i upozorenja stižu uskoro.</p>
    </>
  );
}

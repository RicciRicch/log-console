import type { Metadata } from 'next';
import { FormMessage } from '@/components/form-message';
import { ui } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireTenant } from '@/lib/tenant';
import { saveCourierSecret } from './actions';

export const metadata: Metadata = { title: 'Kuriri · Konzola' };

const courierName: Record<string, string> = { bex: 'BEX Express' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CouriersPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, tenant } = await requireTenant();
  const isAdmin = tenant.role === 'admin';

  const { data: accounts } = await supabase
    .from('courier_accounts')
    .select('id, courier_code, secret_last4, is_default, updated_at')
    .eq('tenant_id', tenant.tenantId)
    .order('courier_code');

  const bex = (accounts ?? []).find((a) => a.courier_code === 'bex');

  return (
    <>
      <div>
        <h1 className={ui.h1}>Kuriri</h1>
        <p className={ui.muted}>
          API ključ kurira omogućava da Konzola sama povlači statuse pošiljki. Ključ se čuva
          šifrovano i posle unosa se više ne prikazuje ceo.
        </p>
      </div>

      <FormMessage error={params.greska} notice={params.poruka} />

      <section className={ui.card}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Kurir</th>
              <th className={ui.th}>API ključ</th>
              <th className={ui.th}>Podrazumevani</th>
              <th className={ui.th}>Poslednja izmena</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).length === 0 && (
              <tr>
                <td className={ui.td} colSpan={4}>
                  Još nijedan kurir nije povezan.
                </td>
              </tr>
            )}
            {(accounts ?? []).map((a) => (
              <tr key={a.id}>
                <td className={ui.td}>{courierName[a.courier_code] ?? a.courier_code}</td>
                <td className={`${ui.td} font-mono tabular-nums`}>
                  {a.secret_last4 ? `••••${a.secret_last4}` : 'nije unet'}
                </td>
                <td className={ui.td}>{a.is_default ? 'Da' : 'Ne'}</td>
                <td className={`${ui.td} tabular-nums`}>{formatDate(a.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isAdmin ? (
        <section className={`${ui.card} space-y-4`}>
          <h2 className={ui.h2}>{bex ? 'Zameni BEX API ključ' : 'Poveži BEX'}</h2>
          <form
            action={saveCourierSecret}
            className="flex flex-wrap items-end gap-3"
            autoComplete="off"
          >
            <input type="hidden" name="courier" value="bex" />
            <div className="min-w-72 flex-1 space-y-1">
              <label htmlFor="secret" className={ui.label}>
                BEX API ključ (token)
              </label>
              <input
                id="secret"
                name="secret"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={`${ui.input} font-mono`}
              />
            </div>
            <button type="submit" className={ui.button}>
              Sačuvaj ključ
            </button>
          </form>
          <p className={ui.muted}>
            Token dobijate od BEX-a mejlom (api@bex.rs), uz broj ugovora. Svaka promena ključa se
            beleži.
          </p>
        </section>
      ) : (
        <p className={ui.muted}>API ključeve menja administrator firme.</p>
      )}
    </>
  );
}

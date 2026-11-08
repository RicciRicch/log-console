import type { Metadata } from 'next';
import { FormMessage } from '@/components/form-message';
import { ui } from '@/components/ui';
import { requireTenant } from '@/lib/tenant';
import { changePassword } from './actions';
import { MfaEnroll } from './mfa-enroll';

export const metadata: Metadata = { title: 'Bezbednost · Konzola' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SecurityPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, tenant } = await requireTenant();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMfa = (factors?.totp ?? []).some((f) => f.status === 'verified');

  return (
    <>
      <div>
        <h1 className={ui.h1}>Bezbednost</h1>
        <p className={ui.muted}>Lozinka i dvostepena prijava za vaš nalog.</p>
      </div>

      <FormMessage error={params.greska} notice={params.poruka} />

      <section className={`${ui.card} space-y-3`}>
        <h2 className={ui.h2}>Dvostepena prijava</h2>
        {hasMfa ? (
          <p className="text-sm">
            <span className="font-medium text-green-800">Uključena.</span> Pri prijavi tražimo i kod
            iz aplikacije na telefonu.
          </p>
        ) : (
          <>
            <p className={ui.muted}>
              Pored lozinke tražimo i kod sa telefona.{' '}
              {tenant.role === 'admin' && 'Obavezna je za isplatu otkupa.'}
            </p>
            <MfaEnroll />
          </>
        )}
      </section>

      <section className={`${ui.card} space-y-3`}>
        <h2 className={ui.h2}>Lozinka</h2>
        <form action={changePassword} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 space-y-1">
            <label htmlFor="new-password" className={ui.label}>
              Nova lozinka
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={ui.input}
            />
          </div>
          <button type="submit" className={ui.button}>
            Promeni lozinku
          </button>
        </form>
        <p className={ui.muted}>Ako ste se prijavili linkom, ovde možete da postavite lozinku.</p>
      </section>
    </>
  );
}

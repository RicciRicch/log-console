import type { Metadata } from 'next';
import { FormMessage } from '@/components/form-message';
import { ui } from '@/components/ui';
import { safeNextPath } from '@/lib/paths';
import { signOut, verifyMfa } from '../actions';

export const metadata: Metadata = { title: 'Dvostepena prijava · Konzola' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MfaPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.sledece);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className={ui.h1}>Dvostepena prijava</h1>
        <p className={ui.muted}>
          Unesite šestocifreni kod iz aplikacije za autentifikaciju na telefonu.
        </p>
      </div>

      <FormMessage error={params.greska} />

      <form action={verifyMfa} className={`${ui.card} space-y-4`}>
        <input type="hidden" name="sledece" value={next} />
        <div className="space-y-1">
          <label htmlFor="kod" className={ui.label}>
            Kod
          </label>
          <input
            id="kod"
            name="kod"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            autoFocus
            className={`${ui.input} tracking-widest`}
          />
        </div>
        <button type="submit" className={`${ui.button} w-full`}>
          Potvrdi
        </button>
      </form>

      <form action={signOut}>
        <button type="submit" className="text-sm text-neutral-600 underline">
          Odjavi se
        </button>
      </form>
    </main>
  );
}

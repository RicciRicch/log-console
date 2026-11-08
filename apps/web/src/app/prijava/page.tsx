import type { Metadata } from 'next';
import { FormMessage } from '@/components/form-message';
import { ui } from '@/components/ui';
import { safeNextPath } from '@/lib/paths';
import { sendMagicLink, signInWithPassword } from './actions';

export const metadata: Metadata = { title: 'Prijava · Konzola' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.sledece);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className={ui.h1}>Prijava u Konzolu</h1>
        <p className={ui.muted}>Pošiljke, statusi i otkupi na jednom mestu.</p>
      </div>

      <FormMessage error={params.greska} notice={params.poruka} />

      <form action={signInWithPassword} className={`${ui.card} space-y-4`}>
        <input type="hidden" name="sledece" value={next} />
        <div className="space-y-1">
          <label htmlFor="email" className={ui.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={ui.input}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className={ui.label}>
            Lozinka
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={ui.input}
          />
        </div>
        <button type="submit" className={`${ui.button} w-full`}>
          Prijavi se
        </button>
      </form>

      <form action={sendMagicLink} className={`${ui.card} space-y-3`}>
        <input type="hidden" name="sledece" value={next} />
        <p className={ui.muted}>
          Nemate lozinku ili ste dobili poziv? Unesite email i poslaćemo vam link za prijavu.
        </p>
        <label htmlFor="magic-email" className="sr-only">
          Email
        </label>
        <input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ime@firma.rs"
          className={ui.input}
        />
        <button type="submit" className={`${ui.buttonSecondary} w-full`}>
          Pošalji link za prijavu
        </button>
      </form>
    </main>
  );
}

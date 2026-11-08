import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ui } from '@/components/ui';
import { listMemberships, requireUser } from '@/lib/tenant';
import { signOut } from '../prijava/actions';
import { chooseTenant } from './actions';

export const metadata: Metadata = { title: 'Izbor firme · Konzola' };

const roleLabel = { admin: 'Administrator', operator: 'Operater' } as const;

export default async function ChooseTenantPage() {
  const { supabase, user } = await requireUser();
  const memberships = await listMemberships(supabase, user.id);
  if (memberships.length === 0) redirect('/bez-pristupa');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className={ui.h1}>Izaberite firmu</h1>
        <p className={ui.muted}>Prijavljeni ste kao {user.email}. U kojoj firmi radite sada?</p>
      </div>

      <ul className="space-y-2">
        {memberships.map((m) => (
          <li key={m.tenantId}>
            <form action={chooseTenant}>
              <input type="hidden" name="tenant_id" value={m.tenantId} />
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-4 py-3 text-left hover:border-neutral-900"
              >
                <span className="font-medium">{m.tenantName}</span>
                <span className={ui.muted}>{roleLabel[m.role]}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={signOut}>
        <button type="submit" className="text-sm text-neutral-600 underline">
          Odjavi se
        </button>
      </form>
    </main>
  );
}

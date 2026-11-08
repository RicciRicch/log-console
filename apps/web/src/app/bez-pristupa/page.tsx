import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ui } from '@/components/ui';
import { listMemberships, requireUser } from '@/lib/tenant';
import { signOut } from '../prijava/actions';

export const metadata: Metadata = { title: 'Nemate pristup · Konzola' };

export default async function NoAccessPage() {
  const { supabase, user } = await requireUser();

  // Možda je poziv stigao u međuvremenu
  await supabase.rpc('accept_invitations');
  if ((await listMemberships(supabase, user.id)).length > 0) redirect('/');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className={ui.h1}>Još nemate pristup nijednoj firmi</h1>
      <p className={ui.muted}>
        Prijavljeni ste kao {user.email}. Zamolite administratora svoje firme da vas pozove sa ovim
        emailom, pa osvežite stranicu.
      </p>
      <form action={signOut}>
        <button type="submit" className={ui.buttonSecondary}>
          Odjavi se
        </button>
      </form>
    </main>
  );
}

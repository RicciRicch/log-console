import Link from 'next/link';
import type { ReactNode } from 'react';
import { ui } from '@/components/ui';
import { requireTenant } from '@/lib/tenant';
import { signOut } from '../prijava/actions';

const roleLabel = { admin: 'Administrator', operator: 'Operater' } as const;

// Svaka strana unutar konzole traži prijavu i izabranu firmu
export default async function KonzolaLayout({ children }: { children: ReactNode }) {
  const { user, tenant, memberships } = await requireTenant();

  const nav = [
    { href: '/', label: 'Početna' },
    { href: '/korisnici', label: 'Korisnici' },
    { href: '/kuriri', label: 'Kuriri' },
    { href: '/bezbednost', label: 'Bezbednost' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/" className="font-semibold">
            Konzola
          </Link>
          <nav aria-label="Glavni meni" className="flex gap-4 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-neutral-700 hover:text-neutral-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              <span className="font-medium">{tenant.tenantName}</span>
              <span className="text-neutral-500"> · {roleLabel[tenant.role]}</span>
            </span>
            {memberships.length > 1 && (
              <Link href="/izbor-firme" className="text-neutral-600 underline">
                Promeni firmu
              </Link>
            )}
            <span className="hidden text-neutral-500 md:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className={ui.buttonSecondary}>
                Odjava
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">{children}</main>
    </div>
  );
}

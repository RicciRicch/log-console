import 'server-only';

import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, type ServerClient } from './supabase/server';

/** Kolačić sa izabranom firmom (korisnik može da bude u više firmi). */
export const TENANT_COOKIE = 'konzola_firma';

export type Role = 'admin' | 'operator';

export interface Membership {
  tenantId: string;
  tenantName: string;
  role: Role;
}

export interface Session {
  supabase: ServerClient;
  user: User;
}

export interface TenantContext extends Session {
  tenant: Membership;
  memberships: Membership[];
}

/** Prijavljen korisnik ili preusmerenje na prijavu. */
export async function requireUser(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/prijava');

  // Ko je uključio dvostepenu prijavu ne može da je preskoči otvaranjem druge strane
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') redirect('/prijava/mfa');

  return { supabase, user };
}

/** Aktivna članstva korisnika (RLS već sakriva neaktivne firme). */
export async function listMemberships(
  supabase: ServerClient,
  userId: string,
): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('tenant_id, role, tenants(name)')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw new Error(`Članstva nisu učitana: ${error.message}`);
  return (data ?? [])
    .map((m) => ({ tenantId: m.tenant_id, tenantName: m.tenants?.name ?? '—', role: m.role }))
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName, 'sr'));
}

/**
 * Izabrana firma. Ako korisnik nema nijednu, ide na /bez-pristupa;
 * ako ima više i nije izabrao, ide na /izbor-firme.
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await requireUser();
  const memberships = await listMemberships(session.supabase, session.user.id);

  if (memberships.length === 0) redirect('/bez-pristupa');

  const chosen = (await cookies()).get(TENANT_COOKIE)?.value;
  const tenant =
    memberships.find((m) => m.tenantId === chosen) ??
    (memberships.length === 1 ? memberships[0] : undefined);

  if (!tenant) redirect('/izbor-firme');

  return { ...session, tenant, memberships };
}

/** Isto kao requireTenant, ali samo za admina izabrane firme. */
export async function requireAdmin(backTo: string): Promise<TenantContext> {
  const ctx = await requireTenant();
  if (ctx.tenant.role !== 'admin') redirect(`${backTo}?greska=nema_prava`);
  return ctx;
}

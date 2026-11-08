'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { listMemberships, requireUser, TENANT_COOKIE } from '@/lib/tenant';

/** Pamti izabranu firmu, ali samo ako je korisnik stvarno njen član. */
export async function chooseTenant(formData: FormData) {
  const tenantId = formData.get('tenant_id');
  const { supabase, user } = await requireUser();
  const memberships = await listMemberships(supabase, user.id);

  if (typeof tenantId !== 'string' || !memberships.some((m) => m.tenantId === tenantId)) {
    redirect('/izbor-firme');
  }

  (await cookies()).set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/');
}

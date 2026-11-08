'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/paths';
import { createClient, type ServerClient } from '@/lib/supabase/server';
import { TENANT_COOKIE } from '@/lib/tenant';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function withNext(path: string, next: string) {
  return next === '/'
    ? path
    : `${path}${path.includes('?') ? '&' : '?'}sledece=${encodeURIComponent(next)}`;
}

/** Posle uspešne prijave: primi pozive, pa traži MFA kod ako ga korisnik ima. (Nije Server Action.) */
async function finishSignIn(supabase: ServerClient, next: string): Promise<never> {
  await supabase.rpc('accept_invitations');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect(withNext('/prijava/mfa', next));
  }
  redirect(next);
}

export async function signInWithPassword(formData: FormData) {
  const email = field(formData, 'email').toLowerCase();
  const password =
    typeof formData.get('password') === 'string' ? String(formData.get('password')) : '';
  const next = safeNextPath(field(formData, 'sledece'));

  if (!email) redirect(withNext('/prijava?greska=email_obavezan', next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(withNext('/prijava?greska=pogresna_prijava', next));

  await finishSignIn(supabase, next);
}

export async function sendMagicLink(formData: FormData) {
  const email = field(formData, 'email').toLowerCase();
  const next = safeNextPath(field(formData, 'sledece'));
  if (!email) redirect(withNext('/prijava?greska=email_obavezan', next));

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const callback = `${proto}://${host}/auth/callback?sledece=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback, shouldCreateUser: true },
  });
  if (error) redirect(withNext('/prijava?greska=link_neuspeh', next));

  redirect('/prijava?poruka=link_poslat');
}

export async function verifyMfa(formData: FormData) {
  const code = field(formData, 'kod').replace(/\s+/g, '');
  const next = safeNextPath(field(formData, 'sledece'));
  const supabase = await createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === 'verified');
  if (listError || !factor) redirect(withNext('/prijava/mfa?greska=mfa_greska', next));

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) redirect(withNext('/prijava/mfa?greska=mfa_kod', next));

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(TENANT_COOKIE);
  redirect('/prijava');
}

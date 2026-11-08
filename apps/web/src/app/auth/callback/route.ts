import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

/**
 * Povratak sa linka iz email-a (magic link / poziv).
 * Podržava `code` (PKCE, isti browser) i `token_hash` (ako se email šablon promeni).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get('sledece'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = url.clone();
  target.search = '';

  if (!ok) {
    target.pathname = '/prijava';
    target.searchParams.set('greska', 'link_istekao');
    return NextResponse.redirect(target);
  }

  await supabase.rpc('accept_invitations');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    target.pathname = '/prijava/mfa';
    if (next !== '/') target.searchParams.set('sledece', next);
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

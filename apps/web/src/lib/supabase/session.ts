import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from './env';

/** Rute koje se otvaraju i bez prijave. */
const PUBLIC_PATHS = ['/prijava', '/auth'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Osvežava Supabase sesiju (kolačiće) na svakom zahtevu i šalje neprijavljene na /prijava.
 * Poziva je src/proxy.ts. Prava zaštita podataka je i dalje RLS u bazi.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Ne ubacivati kod između createServerClient i getUser (preporuka @supabase/ssr)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/prijava';
    login.search = pathname === '/' ? '' : `?sledece=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(login);
    // prenesi osvežene kolačiće i na preusmerenje
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

/**
 * Supabase klijent za Server Components, Server Actions i Route Handlers.
 * Radi kao prijavljeni korisnik (RLS važi). Nikad ne koristi service_role.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component ne sme da piše kolačiće; sesiju osvežava proxy.ts
        }
      },
    },
  });
}

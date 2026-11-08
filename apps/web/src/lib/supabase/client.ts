'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from './env';

/** Supabase klijent za klijentske komponente (samo javni ključ, RLS važi). */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}

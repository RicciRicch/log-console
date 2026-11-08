// Javne vrednosti (idu i u browser). Tajni ključevi (service_role) NIKAD ovde (CLAUDE.md, pravilo 3).
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Nedostaju NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY (vidi apps/web/.env.example)',
    );
  }
  return { url, anonKey };
}

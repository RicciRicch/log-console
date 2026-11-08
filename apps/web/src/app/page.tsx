import { createClient } from '@/lib/supabase/server';

// Prazna početna strana: proverava da web vidi Supabase i sesiju.
// Pravi ekrani dolaze u F01 (prijava) i F06 (lista pošiljki).
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Konzola</h1>
      <p className="mt-2 text-neutral-600">
        {user ? `Prijavljeni ste kao ${user.email}.` : 'Niste prijavljeni.'}
      </p>
    </main>
  );
}

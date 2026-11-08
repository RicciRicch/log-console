'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/tenant';

const PAGE = '/bezbednost';

export async function changePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect(`${PAGE}?greska=lozinka_kratka`);

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`${PAGE}?greska=lozinka_neuspeh`);
  redirect(`${PAGE}?poruka=lozinka_promenjena`);
}

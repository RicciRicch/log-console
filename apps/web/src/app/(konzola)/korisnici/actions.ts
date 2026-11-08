'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/tenant';

const PAGE = '/korisnici';

function text(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

function role(formData: FormData) {
  return text(formData, 'role') === 'admin' ? 'admin' : 'operator';
}

/** Admin poziva kolegu: upisuje poziv, a kolega se prijavljuje linkom sa tim emailom. */
export async function inviteMember(formData: FormData) {
  const { supabase, user, tenant } = await requireAdmin(PAGE);
  const email = text(formData, 'email').toLowerCase();

  const { error } = await supabase.from('invitations').insert({
    tenant_id: tenant.tenantId,
    email,
    role: role(formData),
    invited_by: user.id,
  });

  if (error) {
    redirect(`${PAGE}?greska=${error.code === '23505' ? 'poziv_postoji' : 'poziv_neuspeh'}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?poruka=poziv_poslat`);
}

export async function revokeInvitation(formData: FormData) {
  const { supabase, tenant } = await requireAdmin(PAGE);
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', text(formData, 'id'))
    .eq('tenant_id', tenant.tenantId);
  if (error) redirect(`${PAGE}?greska=izmena_neuspeh`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?poruka=poziv_obrisan`);
}

async function updateMember(
  formData: FormData,
  patch: { role?: 'admin' | 'operator'; is_active?: boolean },
) {
  const { supabase, tenant } = await requireAdmin(PAGE);
  const { error } = await supabase
    .from('memberships')
    .update(patch)
    .eq('tenant_id', tenant.tenantId)
    .eq('user_id', text(formData, 'user_id'));

  if (error) {
    // P0001: triger u bazi ne dozvoljava da firma ostane bez admina
    redirect(`${PAGE}?greska=${error.code === 'P0001' ? 'poslednji_admin' : 'izmena_neuspeh'}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?poruka=sacuvano`);
}

export async function changeRole(formData: FormData) {
  await updateMember(formData, { role: role(formData) });
}

export async function setActive(formData: FormData) {
  await updateMember(formData, { is_active: text(formData, 'is_active') === 'true' });
}

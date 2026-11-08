'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/tenant';

const PAGE = '/kuriri';
const COURIERS = new Set(['bex']);

/**
 * Unos ili zamena API ključa kurira (ADR-008). Ključ ide pravo u bazu kroz
 * set_courier_secret i završava u Vault-u; web ga posle vidi samo kao ••••1234.
 */
export async function saveCourierSecret(formData: FormData) {
  const { supabase, tenant } = await requireAdmin(PAGE);
  const courier = String(formData.get('courier') ?? '');
  const secret = String(formData.get('secret') ?? '');

  if (!COURIERS.has(courier)) redirect(`${PAGE}?greska=kljuc_neuspeh`);

  const { error } = await supabase.rpc('set_courier_secret', {
    p_tenant_id: tenant.tenantId,
    p_courier_code: courier,
    p_secret: secret,
  });

  if (error) {
    const key =
      error.code === '22023'
        ? 'kljuc_kratak'
        : error.code === '42501'
          ? 'nema_prava'
          : 'kljuc_neuspeh';
    redirect(`${PAGE}?greska=${key}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?poruka=kljuc_sacuvan`);
}

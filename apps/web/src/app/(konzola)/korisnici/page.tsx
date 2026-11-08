import type { Metadata } from 'next';
import { FormMessage } from '@/components/form-message';
import { ui } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireTenant } from '@/lib/tenant';
import { changeRole, inviteMember, revokeInvitation, setActive } from './actions';

export const metadata: Metadata = { title: 'Korisnici · Konzola' };

const roleLabel = { admin: 'Administrator', operator: 'Operater' } as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MembersPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, user, tenant } = await requireTenant();
  const isAdmin = tenant.role === 'admin';

  const { data: members } = await supabase.rpc('tenant_members', { p_tenant_id: tenant.tenantId });
  const { data: invitations } = isAdmin
    ? await supabase
        .from('invitations')
        .select('id, email, role, created_at, expires_at')
        .eq('tenant_id', tenant.tenantId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <>
      <div>
        <h1 className={ui.h1}>Korisnici</h1>
        <p className={ui.muted}>
          Ko radi u firmi {tenant.tenantName}.{' '}
          {isAdmin ? 'Ovde pozivate kolege i menjate uloge.' : 'Uloge menja administrator.'}
        </p>
      </div>

      <FormMessage error={params.greska} notice={params.poruka} />

      <section className={ui.card}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Email</th>
              <th className={ui.th}>Uloga</th>
              <th className={ui.th}>Status</th>
              <th className={ui.th}>Od</th>
              {isAdmin && <th className={ui.th}>Radnje</th>}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.user_id}>
                <td className={ui.td}>
                  {m.email}
                  {m.user_id === user.id && <span className="text-neutral-500"> (vi)</span>}
                </td>
                <td className={ui.td}>
                  {isAdmin ? (
                    <form action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <label className="sr-only" htmlFor={`role-${m.user_id}`}>
                        Uloga za {m.email}
                      </label>
                      <select
                        id={`role-${m.user_id}`}
                        name="role"
                        defaultValue={m.role}
                        className="rounded border border-neutral-300 px-2 py-1 text-sm"
                      >
                        <option value="operator">Operater</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <button type="submit" className={ui.buttonSecondary}>
                        Sačuvaj
                      </button>
                    </form>
                  ) : (
                    roleLabel[m.role]
                  )}
                </td>
                <td className={ui.td}>{m.is_active ? 'Aktivan' : 'Deaktiviran'}</td>
                <td className={`${ui.td} tabular-nums`}>{formatDate(m.created_at)}</td>
                {isAdmin && (
                  <td className={ui.td}>
                    <form action={setActive}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={m.is_active ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className={m.is_active ? ui.buttonDanger : ui.buttonSecondary}
                      >
                        {m.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isAdmin && (
        <section className={`${ui.card} space-y-4`}>
          <h2 className={ui.h2}>Pozovi kolegu</h2>
          <form action={inviteMember} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1">
              <label htmlFor="invite-email" className={ui.label}>
                Email
              </label>
              <input id="invite-email" name="email" type="email" required className={ui.input} />
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-role" className={ui.label}>
                Uloga
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="operator"
                className="rounded border border-neutral-300 px-2 py-2 text-sm"
              >
                <option value="operator">Operater</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button type="submit" className={ui.button}>
              Pozovi
            </button>
          </form>
          <p className={ui.muted}>
            Kolega posle otvara stranicu za prijavu, unosi ovaj email i dobija link. Poziv važi 7
            dana.
          </p>

          {(invitations ?? []).length > 0 && (
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Pozvan</th>
                  <th className={ui.th}>Uloga</th>
                  <th className={ui.th}>Važi do</th>
                  <th className={ui.th}>Radnje</th>
                </tr>
              </thead>
              <tbody>
                {(invitations ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className={ui.td}>{i.email}</td>
                    <td className={ui.td}>{roleLabel[i.role]}</td>
                    <td className={`${ui.td} tabular-nums`}>{formatDate(i.expires_at)}</td>
                    <td className={ui.td}>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className={ui.buttonDanger}>
                          Povuci poziv
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
}

-- F01: ekran "Korisnici" treba email kolega. Web ne sme da čita auth.users,
-- pa ova funkcija vraća samo članove firme u kojoj je i pozivalac član.

create function public.tenant_members(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  role public.member_role,
  is_active boolean,
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, u.email::text, m.role, m.is_active, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.tenant_id = p_tenant_id
    and p_tenant_id in (select private.auth_tenant_ids())
  order by m.created_at
$$;

revoke all on function public.tenant_members(uuid) from public, anon;
grant execute on function public.tenant_members(uuid) to authenticated;

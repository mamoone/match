-- Fix infinite RLS recursion: policies on profiles must not re-query profiles.
-- Use a SECURITY DEFINER helper (runs as owner, RLS bypassed inside).

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Profiles: drop the recursive policies and recreate with is_admin()
drop policy if exists "admin_select_all" on public.profiles;

create policy "admin_select_all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin() or id = auth.uid());
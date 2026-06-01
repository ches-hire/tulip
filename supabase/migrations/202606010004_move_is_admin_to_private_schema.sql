create schema if not exists private;

create or replace function private.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
revoke execute on function private.is_admin(uuid) from anon;
revoke execute on function private.is_admin(uuid) from public;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or private.is_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (private.is_admin() and role = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (private.is_admin())
with check (private.is_admin() and role = 'admin');

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (private.is_admin());

drop policy if exists "petals_admin_insert" on public.petals;
create policy "petals_admin_insert"
on public.petals
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "petals_admin_update" on public.petals;
create policy "petals_admin_update"
on public.petals
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "petals_admin_delete" on public.petals;
create policy "petals_admin_delete"
on public.petals
for delete
to authenticated
using (private.is_admin());

drop policy if exists "tulip_images_admin_insert" on storage.objects;
create policy "tulip_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'tulip-images' and private.is_admin());

drop policy if exists "tulip_images_admin_update" on storage.objects;
create policy "tulip_images_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'tulip-images' and private.is_admin())
with check (bucket_id = 'tulip-images' and private.is_admin());

drop policy if exists "tulip_images_admin_delete" on storage.objects;
create policy "tulip_images_admin_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'tulip-images' and private.is_admin());

drop function if exists public.is_admin(uuid);

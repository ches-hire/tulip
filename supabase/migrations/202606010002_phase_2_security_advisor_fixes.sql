create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.is_admin(uuid) from authenticated;

drop policy if exists "tulip_images_public_select" on storage.objects;

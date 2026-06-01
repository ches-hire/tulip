create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.petals (
  id uuid primary key default gen_random_uuid(),
  petal_index integer not null unique check (petal_index between 0 and 5),
  title text not null,
  message text not null,
  image_url text not null,
  memory_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists petals_set_updated_at on public.petals;

create trigger petals_set_updated_at
before update on public.petals
for each row
execute function public.set_updated_at();

create or replace function public.is_admin(user_id uuid default auth.uid())
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

alter table public.profiles enable row level security;
alter table public.petals enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin() and role = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin() and role = 'admin');

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "petals_public_select" on public.petals;
create policy "petals_public_select"
on public.petals
for select
to anon, authenticated
using (true);

drop policy if exists "petals_admin_insert" on public.petals;
create policy "petals_admin_insert"
on public.petals
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "petals_admin_update" on public.petals;
create policy "petals_admin_update"
on public.petals
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "petals_admin_delete" on public.petals;
create policy "petals_admin_delete"
on public.petals
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tulip-images',
  'tulip-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tulip_images_public_select" on storage.objects;
create policy "tulip_images_public_select"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'tulip-images');

drop policy if exists "tulip_images_admin_insert" on storage.objects;
create policy "tulip_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'tulip-images' and public.is_admin());

drop policy if exists "tulip_images_admin_update" on storage.objects;
create policy "tulip_images_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'tulip-images' and public.is_admin())
with check (bucket_id = 'tulip-images' and public.is_admin());

drop policy if exists "tulip_images_admin_delete" on storage.objects;
create policy "tulip_images_admin_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'tulip-images' and public.is_admin());

-- WILDFRAME setup: create your admin user FIRST in Supabase Dashboard > Authentication > Users.
-- Copy that user's UUID and replace ADMIN_USER_UUID below before running this SQL.
-- Create a Storage bucket named wildframe-photos and set it to PUBLIC for public gallery viewing.
-- Public bucket means anyone can view/download published photos; only the admin can upload/delete.

create table if not exists public.photos (
  id bigint generated always as identity primary key,
  caption text not null default 'A moment in nature',
  file_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

revoke all on public.photos from anon, authenticated;
grant select on public.photos to anon, authenticated;
grant insert, delete on public.photos to authenticated;

drop policy if exists "Public can view published photos" on public.photos;
create policy "Public can view published photos"
on public.photos for select
to anon, authenticated
using (true);

drop policy if exists "Admin can add photo records" on public.photos;
create policy "Admin can add photo records"
on public.photos for insert
to authenticated
with check (auth.uid() = 'ADMIN_USER_UUID'::uuid);

drop policy if exists "Admin can delete photo records" on public.photos;
create policy "Admin can delete photo records"
on public.photos for delete
to authenticated
using (auth.uid() = 'ADMIN_USER_UUID'::uuid);

-- Storage write access is restricted independently from table access.
-- The bucket must already exist and be named wildframe-photos.
drop policy if exists "Public can view WildFrame images" on storage.objects;
create policy "Public can view WildFrame images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'wildframe-photos');

drop policy if exists "Admin can upload WildFrame images" on storage.objects;
create policy "Admin can upload WildFrame images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wildframe-photos'
  and auth.uid() = 'ADMIN_USER_UUID'::uuid
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admin can delete WildFrame images" on storage.objects;
create policy "Admin can delete WildFrame images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'wildframe-photos'
  and auth.uid() = '02d0dd59-3dd8-4c32-813d-73c7b640ed0b'::uuid
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- No UPDATE policy is created intentionally. This app adds and deletes photos only.


-- Instagram profile setting used by the footer and Admin Panel.
-- Replace ADMIN_USER_UUID with the same admin UUID used above.
-- Run this in Supabase SQL Editor once.
-- Replace ADMIN_USER_UUID below with the UUID of your admin account
-- (the same UUID used by the existing photos/storage admin policies).

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  instagram_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

drop policy if exists "Public can read WildFrame site settings" on public.site_settings;
create policy "Public can read WildFrame site settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admin can insert WildFrame site settings" on public.site_settings;
create policy "Admin can insert WildFrame site settings"
on public.site_settings for insert
to authenticated
with check (auth.uid() = 'ADMIN_USER_UUID'::uuid);

drop policy if exists "Admin can update WildFrame site settings" on public.site_settings;
create policy "Admin can update WildFrame site settings"
on public.site_settings for update
to authenticated
using (auth.uid() = 'ADMIN_USER_UUID'::uuid)
with check (auth.uid() = 'ADMIN_USER_UUID'::uuid);

insert into public.site_settings (id, instagram_url)
values (1, null)
on conflict (id) do nothing;

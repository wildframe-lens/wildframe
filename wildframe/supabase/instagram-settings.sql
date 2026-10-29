-- WildFrame Instagram footer setting
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

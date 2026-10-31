-- WildFrame anonymous visitor + photo-view analytics.
-- Replace ADMIN_USER_UUID with the SAME Supabase Auth user UUID used by
-- the existing photos and site_settings admin policies, then run in SQL Editor.

create table if not exists public.site_analytics (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  event_type text not null check (event_type in ('visit', 'photo_view')),
  photo_id bigint,
  created_at timestamptz not null default now(),
  constraint photo_view_requires_photo check (event_type <> 'photo_view' or photo_id is not null)
);

create index if not exists site_analytics_event_created_idx
  on public.site_analytics (event_type, created_at desc);
create index if not exists site_analytics_photo_idx
  on public.site_analytics (photo_id) where event_type = 'photo_view';
create index if not exists site_analytics_visitor_idx
  on public.site_analytics (visitor_id) where event_type = 'visit';

alter table public.site_analytics enable row level security;
revoke all on public.site_analytics from anon, authenticated;
grant insert on public.site_analytics to anon, authenticated;
grant select on public.site_analytics to authenticated;

drop policy if exists "Public can record anonymous WildFrame analytics" on public.site_analytics;
create policy "Public can record anonymous WildFrame analytics"
on public.site_analytics for insert
to anon, authenticated
with check (
  event_type in ('visit', 'photo_view')
  and visitor_id is not null
  and (event_type <> 'photo_view' or photo_id is not null)
);

drop policy if exists "Only WildFrame admin can read analytics" on public.site_analytics;
create policy "Only WildFrame admin can read analytics"
on public.site_analytics for select
to authenticated
using (auth.uid() = 'ADMIN_USER_UUID'::uuid);

-- No public SELECT, UPDATE, or DELETE policy is created.

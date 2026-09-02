-- 004_clerk_user_id_text.sql
-- Clerk's user IDs (e.g. "user_2abc9XyZ...") are not UUIDs, but every
-- user-identifying column here was typed `uuid` (matching Supabase Auth's
-- own id format, from schema.sql / 003_schema_v2.sql). That breaks account
-- creation for every real Clerk sign-in with:
--   "invalid input syntax for type uuid: <clerk id>"
-- Confirmed by directly exercising POST /auth/clerk-sync with a
-- non-UUID id against the live database.
--
-- This migration widens user_profiles.id and every user_id foreign key
-- column to `text`, which holds both a Supabase-Auth-style UUID (existing
-- rows keep working unchanged) and a Clerk-style string id.
--
-- Run this once in the Supabase SQL Editor (dashboard → SQL Editor → paste
-- → Run). It's written to be safe to re-run if it's interrupted partway
-- (every DROP uses IF EXISTS).

begin;

-- Drop the auth.users FK on user_profiles.id — Clerk users have no
-- corresponding Supabase auth.users row, so this reference can no longer
-- be enforced now that Clerk (not Supabase Auth) issues the id for most users.
alter table public.user_profiles drop constraint if exists user_profiles_id_fkey;

-- Drop FKs from every table that references user_profiles(id), so the
-- type change below doesn't fail on a mismatched constraint.
alter table public.pillars              drop constraint if exists pillars_user_id_fkey;
alter table public.categories           drop constraint if exists categories_user_id_fkey;
alter table public.goals                drop constraint if exists goals_user_id_fkey;
alter table public.daily_logs           drop constraint if exists daily_logs_user_id_fkey;
alter table public.tasks                drop constraint if exists tasks_user_id_fkey;
alter table public.time_blocks          drop constraint if exists time_blocks_user_id_fkey;
alter table public.user_stats           drop constraint if exists user_stats_user_id_fkey;
alter table public.badges               drop constraint if exists badges_user_id_fkey;
alter table public.memories             drop constraint if exists memories_user_id_fkey;
alter table public.ryna_conversations   drop constraint if exists ryna_conversations_user_id_fkey;
alter table public.notification_prefs   drop constraint if exists notification_prefs_user_id_fkey;
alter table public.notifications        drop constraint if exists notifications_user_id_fkey;

-- Postgres won't retype a column that an RLS policy references, so every
-- policy touching these columns has to go first — they're recreated (with
-- an auth.uid()::text cast, since these columns are about to become text)
-- at the end of this migration.
drop policy if exists "Users can view own profile"          on public.user_profiles;
drop policy if exists "Users can update own profile"        on public.user_profiles;
drop policy if exists "Users can insert own profile"        on public.user_profiles;
drop policy if exists "Users can CRUD own pillars"          on public.pillars;
drop policy if exists "Users can CRUD own categories"       on public.categories;
drop policy if exists "Users can CRUD own goals"            on public.goals;
drop policy if exists "Users can CRUD own milestones"       on public.milestones;
drop policy if exists "Users can CRUD own daily logs"       on public.daily_logs;
drop policy if exists "Users can CRUD own tasks"             on public.tasks;
drop policy if exists "Users can CRUD own time blocks"       on public.time_blocks;
drop policy if exists "Users can view own stats"             on public.user_stats;
drop policy if exists "Users can update own stats"           on public.user_stats;
drop policy if exists "Users can view own badges"            on public.badges;
drop policy if exists "System can award badges"              on public.badges;
drop policy if exists "Users can CRUD own memories"          on public.memories;
drop policy if exists "Users can CRUD own conversations"     on public.ryna_conversations;
drop policy if exists "Users can CRUD own notification prefs" on public.notification_prefs;
drop policy if exists "Users can CRUD own notifications"     on public.notifications;

-- The leaderboard view also depends on user_profiles.id — drop and recreate
-- it around the type change too.
drop view if exists public.leaderboard;

-- Widen the primary key first...
alter table public.user_profiles alter column id type text using id::text;

-- ...then every column that references it.
alter table public.pillars              alter column user_id type text using user_id::text;
alter table public.categories           alter column user_id type text using user_id::text;
alter table public.goals                alter column user_id type text using user_id::text;
alter table public.daily_logs           alter column user_id type text using user_id::text;
alter table public.tasks                alter column user_id type text using user_id::text;
alter table public.time_blocks          alter column user_id type text using user_id::text;
alter table public.user_stats           alter column user_id type text using user_id::text;
alter table public.badges               alter column user_id type text using user_id::text;
alter table public.memories             alter column user_id type text using user_id::text;
alter table public.ryna_conversations   alter column user_id type text using user_id::text;
alter table public.notification_prefs   alter column user_id type text using user_id::text;
alter table public.notifications        alter column user_id type text using user_id::text;

-- Re-add the FKs to user_profiles(id), now that both sides are `text`.
alter table public.pillars              add constraint pillars_user_id_fkey            foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.categories           add constraint categories_user_id_fkey         foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.goals                add constraint goals_user_id_fkey              foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.daily_logs           add constraint daily_logs_user_id_fkey         foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.tasks                add constraint tasks_user_id_fkey              foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.time_blocks          add constraint time_blocks_user_id_fkey        foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.user_stats           add constraint user_stats_user_id_fkey         foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.badges               add constraint badges_user_id_fkey             foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.memories             add constraint memories_user_id_fkey           foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.ryna_conversations   add constraint ryna_conversations_user_id_fkey foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.notification_prefs   add constraint notification_prefs_user_id_fkey foreign key (user_id) references public.user_profiles(id) on delete cascade;
alter table public.notifications        add constraint notifications_user_id_fkey      foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- Recreate the RLS policies, now comparing against `text` columns. Note:
-- the backend's actual enforcement boundary today is the FastAPI layer (it
-- uses the service-role key, which bypasses RLS) since Clerk-issued JWTs
-- aren't verified by Supabase/PostgREST here — these policies matter if/when
-- anything queries Supabase directly with the anon key.
create policy "Users can view own profile"   on public.user_profiles for select using (auth.uid()::text = id);
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid()::text = id);
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid()::text = id);

create policy "Users can CRUD own pillars" on public.pillars for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own categories" on public.categories for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own goals" on public.goals for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own milestones" on public.milestones for all
  using (auth.uid()::text = (select user_id from public.goals where id = milestones.goal_id))
  with check (auth.uid()::text = (select user_id from public.goals where id = milestones.goal_id));

create policy "Users can CRUD own daily logs" on public.daily_logs for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own tasks" on public.tasks for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own time blocks" on public.time_blocks for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can view own stats"   on public.user_stats for select using (auth.uid()::text = user_id);
create policy "Users can update own stats" on public.user_stats for update using (auth.uid()::text = user_id);

create policy "Users can view own badges" on public.badges for select using (auth.uid()::text = user_id);
create policy "System can award badges"   on public.badges for insert with check (auth.uid()::text = user_id);

create policy "Users can CRUD own memories" on public.memories for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own conversations" on public.ryna_conversations for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own notification prefs" on public.notification_prefs for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

create policy "Users can CRUD own notifications" on public.notifications for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

-- Recreate the leaderboard view (unchanged from schema.sql — user_id is now
-- text instead of uuid, which the view just passes through as-is).
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.name,
  substring(p.name from 1 for 1) as avatar_initial,
  p.level,
  p.xp,
  p.streak as streak_current,
  p.weekly_score,
  p.occupation,
  (select string_agg(distinct t.pillar_id, ', ') from public.tasks t where t.user_id = p.id) as pillars,
  (select badge_id from public.badges b where b.user_id = p.id order by b.earned_at desc limit 1) as badge
from public.user_profiles p
where p.onboarding_complete = true
order by p.xp desc;

commit;

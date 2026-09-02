-- GoalFlow v2 — Complete Database Schema
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Enable pgvector extension for AI memory
create extension if not exists vector;

-- =============================================
-- USERS (extends Supabase auth.users)
-- =============================================
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  timezone text default 'Africa/Lagos',
  occupation text,
  weekly_hours integer default 40,
  avatar_url text,
  level integer default 1,
  xp integer default 0,
  streak integer default 0,
  longest_streak integer default 0,
  onboarding_complete boolean default false,
  onboarding_mode text default 'form',
  coach_style text default 'strategist',
  has_9_to_5 boolean default false,
  work_start_time time,
  work_end_time time,
  total_tasks_completed integer default 0,
  weekly_score decimal(3,1) default 0,
  wake_time time,
  sleep_time time,
  deep_work_windows jsonb not null default '[]',
  created_at timestamp with time zone default now()
);

-- RLS: users can only access their own profile
alter table public.user_profiles enable row level security;
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- =============================================
-- PILLARS (user-customizable)
-- =============================================
create table if not exists public.pillars (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  pillar_id text not null,
  label text not null,
  description text,
  color text,
  icon text,
  enabled boolean default true,
  categories text[],
  weekly_kpis text[],
  unique(user_id, pillar_id)
);

alter table public.pillars enable row level security;
create policy "Users can CRUD own pillars"
  on public.pillars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- CATEGORIES (life categories)
-- =============================================
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  category_id text not null,
  label text not null,
  description text,
  icon text,
  color text,
  enabled boolean default true,
  pillar_id text,
  unique(user_id, category_id)
);

alter table public.categories enable row level security;
create policy "Users can CRUD own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- GOALS (90-day sprints)
-- =============================================
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  pillar_id text not null,
  category_id text,
  title text not null,
  description text,
  target_date date not null,
  status text default 'active',
  progress integer default 0 check (progress >= 0 and progress <= 100),
  goal_type text,
  weekly_kpis text[],
  weekly_plan text,
  strategy text,
  created_at timestamp with time zone default now()
);

alter table public.goals enable row level security;
create policy "Users can CRUD own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- MILESTONES
-- =============================================
create table if not exists public.milestones (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  title text not null,
  due_date date,
  completed boolean default false,
  completed_at timestamp with time zone
);

alter table public.milestones enable row level security;
create policy "Users can CRUD own milestones"
  on public.milestones for all
  using (
    auth.uid() = (select user_id from public.goals where id = milestones.goal_id)
  )
  with check (
    auth.uid() = (select user_id from public.goals where id = milestones.goal_id)
  );

-- =============================================
-- DAILY LOGS
-- =============================================
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  date_key date not null,
  build_hours decimal(4,1) default 0,
  score decimal(3,1) default 0,
  reflection_accomplished text,
  reflection_blocked text,
  reflection_grateful text,
  reflection_tomorrow_focus text,
  pillar_completion jsonb default '{}',
  updated_at timestamp with time zone default now(),
  unique(user_id, date_key)
);

alter table public.daily_logs enable row level security;
create policy "Users can CRUD own daily logs"
  on public.daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- TASKS
-- =============================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  date_key date not null,
  pillar_id text not null,
  category_id text,
  title text not null,
  description text,
  estimated_minutes integer,
  actual_minutes integer,
  status text default 'pending',
  is_ai_generated boolean default false,
  start_time time,
  end_time time,
  ai_context text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

alter table public.tasks enable row level security;
create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- TIME BLOCKS (24h planner)
-- =============================================
create table if not exists public.time_blocks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  date_key date not null,
  label text not null,
  category text not null,
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  duration_minutes integer not null,
  pillar_id text,
  completed boolean default false,
  skipped boolean default false,
  flexible boolean default true,
  priority text default 'medium',
  user_editable boolean default true,
  notes text,
  assigned_by text,
  created_at timestamp with time zone default now()
);

alter table public.time_blocks enable row level security;
create policy "Users can CRUD own time blocks"
  on public.time_blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- USER STATS (XP / Levels / Badges)
-- =============================================
create table if not exists public.user_stats (
  user_id uuid references public.user_profiles(id) on delete cascade primary key,
  xp integer default 0,
  level integer default 1,
  streak_current integer default 0,
  streak_longest integer default 0,
  last_log_date date,
  weekly_score decimal(3,1)
);

alter table public.user_stats enable row level security;
create policy "Users can view own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);
create policy "Users can update own stats"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- =============================================
-- BADGES
-- =============================================
create table if not exists public.badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  badge_id text not null,
  earned_at timestamp with time zone default now(),
  unique(user_id, badge_id)
);

alter table public.badges enable row level security;
create policy "Users can view own badges"
  on public.badges for select
  using (auth.uid() = user_id);
create policy "System can award badges"
  on public.badges for insert
  with check (auth.uid() = user_id);

-- =============================================
-- MEMORY (pgvector for Ryna AI)
-- =============================================
create table if not exists public.memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  date_key date not null,
  content text not null,
  embedding vector(1536),
  created_at timestamp with time zone default now()
);

alter table public.memories enable row level security;
create policy "Users can CRUD own memories"
  on public.memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for vector similarity search
create index if not exists memories_embedding_idx
  on public.memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- =============================================
-- CONVERSATIONS (Ryna chat history)
-- =============================================
create table if not exists public.ryna_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  date_key date not null,
  messages jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.ryna_conversations enable row level security;
create policy "Users can CRUD own conversations"
  on public.ryna_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- NOTIFICATION PREFS
-- =============================================
create table if not exists public.notification_prefs (
  user_id uuid references public.user_profiles(id) on delete cascade primary key,
  push_enabled boolean default false,
  morning_briefing boolean default true,
  morning_time time default '07:00',
  evening_reflection boolean default true,
  evening_time time default '21:00',
  task_reminders boolean default true,
  block_transitions boolean default true,
  coach_nudges boolean default true,
  weekly_report boolean default true
);

alter table public.notification_prefs enable row level security;
create policy "Users can CRUD own notification prefs"
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS
-- =============================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text not null,
  time text,
  dismissed boolean default false,
  action_label text,
  mcp_action jsonb,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;
create policy "Users can CRUD own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- LEADERBOARD (materialized view)
-- =============================================
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

-- =============================================
-- INDEXES for performance
-- =============================================
create index if not exists idx_daily_logs_user_date on public.daily_logs(user_id, date_key);
create index if not exists idx_tasks_user_date on public.tasks(user_id, date_key);
create index if not exists idx_time_blocks_user_date on public.time_blocks(user_id, date_key);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_memories_user on public.memories(user_id);
create index if not exists idx_notifications_user on public.notifications(user_id, dismissed);

-- =============================================
-- FUNCTIONS: Update timestamp on daily_logs
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists update_daily_logs_updated_at
  before update on public.daily_logs
  for each row
  execute function public.handle_updated_at();

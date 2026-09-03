-- 009_projects_routine_planning.sql
--
-- GoalFlow could model "a goal with a target date" and "a one-off task on a
-- date", but not the thing most of a real week actually consists of: an
-- ongoing body of work with a *cadence*, dropped into a *fixed daily
-- container*. "Ndara AI, daily, 9am-1pm" and "Post Streak, 2x/week, 8-10pm"
-- had nowhere to live, so nothing could answer "what should I do in the next
-- hour" or "plan my week" — there was no recurrence and no container to plan
-- against.
--
-- Three new tables:
--   projects        — ongoing work with a cadence and preferred slot types
--   routine_blocks  — the weekly container (sleep/transit/deep work/open),
--                     a template per weekday that days are materialised from
--   project_updates — the running log ("I'll keep recording updates"), which
--                     is also the memory the planner reads cadence debt from

begin;

-- ── Projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  -- text, not uuid: user_profiles.id is text (self-issued JWT auth, not
  -- Supabase Auth — see 004_clerk_user_id_text.sql), matching every other
  -- table's user_id column.
  user_id text references public.user_profiles(id) on delete cascade not null,
  name text not null,
  description text,
  pillar_id text,
  goal_id uuid references public.goals(id) on delete set null,

  -- Category of work, mostly for grouping in the UI
  kind text not null default 'work'
    check (kind in ('work','startup','personal_build','learning','content','outreach','health','relationships','other')),

  status text not null default 'active'
    check (status in ('active','paused','dormant','done')),

  -- Cadence: how often this wants attention.
  --   daily     -> every day (sessions_per_week ignored, treated as 7)
  --   weekly    -> sessions_per_week times a week, any allowed day
  --   fixed_day -> only on the weekdays listed in cadence_days
  --   flexible  -> no obligation; only scheduled when there's spare room
  cadence_type text not null default 'weekly'
    check (cadence_type in ('daily','weekly','fixed_day','flexible')),
  sessions_per_week integer not null default 1 check (sessions_per_week between 0 and 21),
  -- Postgres/Python weekday convention: 0=Mon .. 6=Sun
  cadence_days smallint[] not null default '{}',

  -- Which routine slots this work fits into (matches routine_blocks.slot_type)
  slot_types text[] not null default '{}',
  session_minutes integer not null default 60 check (session_minutes between 5 and 720),

  -- The one thing to protect first when the week is overloaded
  is_main_quest boolean not null default false,
  priority integer not null default 2 check (priority between 1 and 5),

  last_worked_on date,
  created_at timestamp with time zone default now()
);

create index if not exists idx_projects_user on public.projects(user_id, status);

-- RLS is enabled for parity with every other table, but is inert in
-- practice: this backend authenticates with its own JWT, not Supabase
-- Auth, so auth.uid() is null here — access control is enforced in the
-- FastAPI routers (service-role client, every query scoped by the verified
-- token's user id), same as goals/tasks/time_blocks already are.
alter table public.projects enable row level security;
create policy "Users can CRUD own projects"
  on public.projects for all
  using ((auth.uid())::text = user_id)
  with check ((auth.uid())::text = user_id);


-- ── Routine blocks (the weekly container) ───────────────────────────────────
create table if not exists public.routine_blocks (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.user_profiles(id) on delete cascade not null,
  label text not null,
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  end_minute integer not null check (end_minute > 0 and end_minute <= 1440),
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',

  -- What kind of slot this is. Projects declare which of these they fit.
  slot_type text not null default 'open'
    check (slot_type in ('sleep','routine','transit','deep_work','open','evening_build','night_study','buffer')),

  -- Whether the planner may allocate project sessions into it. Sleep,
  -- prayer/exercise and prep are the container, not schedulable space.
  is_schedulable boolean not null default false,

  -- Maps onto the planner's existing BlockCategory for rendering
  category text not null default 'admin',
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_routine_user on public.routine_blocks(user_id);

alter table public.routine_blocks enable row level security;
create policy "Users can CRUD own routine blocks"
  on public.routine_blocks for all
  using ((auth.uid())::text = user_id)
  with check ((auth.uid())::text = user_id);


-- ── Project updates (the running log = the planner's memory) ────────────────
create table if not exists public.project_updates (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.user_profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  date_key date not null default current_date,
  note text,
  minutes_spent integer default 0 check (minutes_spent >= 0),
  -- Counts as one session against the cadence. A blocker//note-only entry
  -- can be logged without claiming the session was actually worked.
  counts_as_session boolean not null default true,
  blocker text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_project_updates_user_date on public.project_updates(user_id, date_key desc);
create index if not exists idx_project_updates_project on public.project_updates(project_id, date_key desc);

alter table public.project_updates enable row level security;
create policy "Users can CRUD own project updates"
  on public.project_updates for all
  using ((auth.uid())::text = user_id)
  with check ((auth.uid())::text = user_id);


-- ── Link planner blocks back to the project that put them there ─────────────
alter table public.time_blocks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

commit;

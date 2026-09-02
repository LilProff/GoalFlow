-- 007_goal_hierarchy_and_import.sql
--
-- Goals were forced into a single flat model, every one defaulting to a
-- hardcoded 90-day target date (see onboarding.py's save-step and
-- Goals.tsx's defaultTarget()). This migration adds what's needed for:
--   1. long-term goals with short-term goals laddering up to them
--   2. a per-goal prospective timeline that can be adjusted (with an
--      audit trail of why) instead of one universal sprint length
--   3. tracking whether a goal came from manual entry or the AI-import
--      onboarding flow
--   4. a lightweight sub-task checklist on daily tasks
--
-- Only new nullable/defaulted columns — no type changes, so (unlike
-- 004_clerk_user_id_text.sql) no RLS policies need to be dropped and
-- recreated.

begin;

alter table public.goals
  add column if not exists parent_goal_id uuid references public.goals(id) on delete set null,
  add column if not exists timeline_type text not null default 'short-term'
    check (timeline_type in ('long-term','short-term')),
  add column if not exists origin text not null default 'manual'
    check (origin in ('manual','ai_import')),
  add column if not exists timeline_history jsonb not null default '[]';

alter table public.tasks
  add column if not exists subtasks jsonb not null default '[]';

create index if not exists idx_goals_parent on public.goals(parent_goal_id);

commit;

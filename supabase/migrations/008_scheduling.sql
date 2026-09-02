-- 008_scheduling.sql
--
-- Onboarding's Schedule step has always collected wake time, sleep time and
-- deep-work windows (Onboarding.tsx step 4 / store.ts's onboarding.schedule)
-- but never persisted them anywhere — completeOnboarding() only ever sent
-- the onboarding_complete flag, so this data was silently dropped for every
-- user. This adds real columns for it, plus a lightweight "commitment"
-- marker on time_blocks (who/what assigned a fixed block — reuses the
-- existing flexible/priority='fixed' reshuffle-anchoring mechanism rather
-- than a new table).

begin;

alter table public.user_profiles
  add column if not exists wake_time time,
  add column if not exists sleep_time time,
  add column if not exists deep_work_windows jsonb not null default '[]';

alter table public.time_blocks
  add column if not exists assigned_by text;

commit;

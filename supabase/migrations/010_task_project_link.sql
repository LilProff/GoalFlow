-- 010_task_project_link.sql
--
-- The Today/Dashboard task checklist (tasks table) and the Planner schedule
-- (time_blocks, already linked to projects via 009's project_id) were two
-- disconnected views of "what to do" — running the week-planner filled the
-- Planner with real, cadence-driven work, but Today kept showing whatever
-- was there before (stale/manually-generated tasks), because nothing wrote
-- to `tasks` from the planning engine. This lets a project-driven task be
-- traced back to the project it came from, the same way time_blocks already
-- can be.

begin;

alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

commit;

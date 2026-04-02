-- GoalFlow: Cloud sync table
-- Run this in Supabase Studio → SQL Editor

CREATE TABLE IF NOT EXISTS public.goalflow_data (
  user_id   TEXT PRIMARY KEY DEFAULT 'samuel',
  data      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goalflow_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app for now)
CREATE POLICY "allow_all" ON public.goalflow_data
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default row so upsert always works
INSERT INTO public.goalflow_data (user_id, data, updated_at)
VALUES ('samuel', '{}', now())
ON CONFLICT (user_id) DO NOTHING;

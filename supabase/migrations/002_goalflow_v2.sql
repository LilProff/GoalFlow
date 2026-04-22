-- GoalFlow v2 Database Schema
-- Run this in Supabase Studio → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- Users table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  timezone        TEXT DEFAULT 'Africa/Lagos',
  phase           INTEGER DEFAULT 1 CHECK (phase IN (1, 2, 3)),
  coaching_style  TEXT DEFAULT 'balanced' CHECK (coaching_style IN ('drill_sergeant', 'balanced', 'gentle')),
  wake_time       TIME DEFAULT '05:00',
  sleep_time      TIME DEFAULT '22:00',
  hours_available INTEGER DEFAULT 4 CHECK (hours_available IN (2, 4, 6, 8)),
  onboarding_complete BOOLEAN DEFAULT false,
  plan_tier      TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'team')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Pillar Goals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pillar_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pillar         TEXT NOT NULL CHECK (pillar IN ('BUILD', 'SHOW', 'EARN', 'SYSTEMIZE')),
  goal_90day     TEXT,
  target_income  TEXT,
  target_content TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pillar)
);

-- ─────────────────────────────────────────────────────────────
-- Daily Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  build_done      BOOLEAN DEFAULT false,
  show_done      BOOLEAN DEFAULT false,
  earn_done      BOOLEAN DEFAULT false,
  systemize_done  BOOLEAN DEFAULT false,
  build_hours    NUMERIC(3,1) DEFAULT 0,
  score          INTEGER DEFAULT 0,
  reflection     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- Daily Tasks (AI-generated)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  pillar         TEXT NOT NULL CHECK (pillar IN ('BUILD', 'SHOW', 'EARN', 'SYSTEMIZE')),
  label          TEXT NOT NULL,
  completed      BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- User Stats (XP, Levels, Streaks)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  xp              INTEGER DEFAULT 0,
  level           TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'builder', 'operator', 'beast')),
  streak_current INTEGER DEFAULT 0,
  streak_longest  INTEGER DEFAULT 0,
  last_log_date  DATE,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- AI Conversations (Memory)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  messages       JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Notifications Prefs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  morning_brief   TIME DEFAULT '06:00',
  evening_reminder TIME DEFAULT '20:00',
  streak_alerts   BOOLEAN DEFAULT true,
  weekly_report  BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_can_read_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_can_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "pillar_goals_are_private" ON public.pillar_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "daily_logs_are_private" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "tasks_are_private" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_stats_are_private" ON public.user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "conversations_are_private" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notification_prefs_are_private" ON public.notification_prefs FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_conversations_user_date ON public.conversations(user_id, date);

-- ─────────────────────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────────────────────

-- Calculate score from daily log
CREATE OR REPLACE FUNCTION calculate_score(
  p_build_done BOOLEAN,
  p_show_done BOOLEAN,
  p_earn_done BOOLEAN,
  p_systemize_done BOOLEAN,
  p_build_hours NUMERIC
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  IF p_build_done THEN score := score + 3; END IF;
  IF p_show_done THEN score := score + 2; END IF;
  IF p_earn_done THEN score := score + 2; END IF;
  IF p_systemize_done THEN score := score + 2; END IF;
  IF p_build_hours >= 4 THEN score := score + 1; END IF;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Update XP and level
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_xp INTEGER) RETURNS void AS $$
BEGIN
  UPDATE public.user_stats
  SET xp = xp + p_xp,
      level = CASE
        WHEN xp + p_xp >= 120 THEN 'beast'
        WHEN xp + p_xp >= 60 THEN 'operator'
        WHEN xp + p_xp >= 30 THEN 'builder'
        ELSE 'beginner'
      END,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Update streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID) RETURNS void AS $$
DECLARE
  last_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT last_log_date INTO last_date FROM public.user_stats WHERE user_id = p_user_id;
  
  IF last_date IS NULL THEN
    UPDATE public.user_stats SET streak_current = 1, last_log_date = today WHERE user_id = p_user_id;
  ELSIF last_date = today - 1 THEN
    UPDATE public.user_stats 
    SET streak_current = streak_current + 1,
        streak_longest = GREATEST(streak_current + 1, streak_longest),
        last_log_date = today
    WHERE user_id = p_user_id;
  ELSIF last_date != today THEN
    UPDATE public.user_stats SET streak_current = 1, last_log_date = today WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- Trigger for new user setup
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default stats
  INSERT INTO public.user_stats (user_id, xp, level, streak_current, streak_longest)
  VALUES (NEW.id, 0, 'beginner', 0, 0);
  
  -- Create default notification prefs
  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_user_defaults();
-- ============================================================
--  VERITUS — Supabase Schema
--  Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────── HELPERS ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────── USER PROFILES ──────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name             TEXT,
  avatar_url            TEXT,
  timezone              TEXT    DEFAULT 'UTC',
  currency              TEXT    DEFAULT 'USD',
  ai_enabled            BOOLEAN DEFAULT TRUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────── TASKS ──────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  priority     TEXT        DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  due_date     TIMESTAMPTZ,
  tags         TEXT[]      DEFAULT '{}',
  is_focus     BOOLEAN     DEFAULT FALSE,
  ai_suggested BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status   ON tasks(status);

-- ─────────────────────── TRANSACTIONS ───────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT         NOT NULL CHECK (type IN ('income','expense')),
  amount      NUMERIC(12,2) NOT NULL,
  category    TEXT         NOT NULL,
  description TEXT,
  date        DATE         DEFAULT CURRENT_DATE,
  tags        TEXT[]       DEFAULT '{}',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT          NOT NULL,
  target_amount  NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline       DATE,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);
CREATE TRIGGER trg_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────── LEARNING ───────────────────────────
CREATE TABLE IF NOT EXISTS learning_subjects (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT         NOT NULL,
  category      TEXT,
  description   TEXT,
  progress      INTEGER      DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  target_hours  NUMERIC(8,2) DEFAULT 0,
  logged_hours  NUMERIC(8,2) DEFAULT 0,
  goal          TEXT,
  resources     TEXT[]       DEFAULT '{}',
  color         TEXT         DEFAULT '#00d4ff',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE TRIGGER trg_learning_subjects_updated_at
  BEFORE UPDATE ON learning_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS learning_sessions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id       UUID        REFERENCES learning_subjects(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER     NOT NULL CHECK (duration_minutes > 0),
  notes            TEXT,
  date             DATE        DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_learning_sessions_subject ON learning_sessions(subject_id);

-- ─────────────────────── NOTES ──────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT        NOT NULL,
  content      TEXT        DEFAULT '',
  tags         TEXT[]      DEFAULT '{}',
  linked_notes UUID[]      DEFAULT '{}',
  is_pinned    BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes

  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- ─────────────────────── HABITS ─────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT        NOT NULL,
  description    TEXT,
  frequency      TEXT        DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  streak         INTEGER     DEFAULT 0,
  longest_streak INTEGER     DEFAULT 0,
  color          TEXT        DEFAULT '#00d4ff',
  icon           TEXT        DEFAULT '⭐',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS habit_completions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id       UUID        REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE        DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, completed_date)
);
CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id);

-- ─────────────────────── GOALS ──────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  type         TEXT        DEFAULT 'short_term' CHECK (type IN ('short_term','long_term')),
  status       TEXT        DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  progress     INTEGER     DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  deadline     DATE,
  category     TEXT,
  ai_suggested BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS goal_milestones (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id   UUID        REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title     TEXT        NOT NULL,
  completed BOOLEAN     DEFAULT FALSE,
  due_date  DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);

-- ─────────────────────── DEVICES ────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT        NOT NULL,
  device_type   TEXT        DEFAULT 'other' CHECK (device_type IN ('laptop','phone','tablet','desktop','other')),
  os            TEXT,
  browser       TEXT,
  ip_address    TEXT,
  location      TEXT,
  latitude      NUMERIC(10,8),
  longitude     NUMERIC(11,8),
  is_online     BOOLEAN     DEFAULT FALSE,
  is_trusted    BOOLEAN     DEFAULT FALSE,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  user_agent    TEXT,
  session_token TEXT        UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_devices_user_id ON devices(user_id);

CREATE TABLE IF NOT EXISTS device_activity_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id  UUID        REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action     TEXT        NOT NULL,
  details    JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_device_logs_device ON device_activity_logs(device_id);

-- ─────────────────────── AI CHAT HISTORY ────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content    TEXT        NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_chat_user ON ai_chat_history(user_id, created_at DESC);

-- ─────────────────────── NOTIFICATION PROGRAMS ─────────────
CREATE TABLE IF NOT EXISTS notification_programs (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name               TEXT        NOT NULL,
  description        TEXT,
  prompt             TEXT        NOT NULL,
  delivery_mode      TEXT        DEFAULT 'immersive' CHECK (delivery_mode IN ('standard','time_sensitive','immersive')),
  schedule_type      TEXT        DEFAULT 'daily' CHECK (schedule_type IN ('once','daily','weekly')),
  schedule_time      TEXT        DEFAULT '07:00' CHECK (schedule_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  schedule_date      DATE,
  weekdays           SMALLINT[]  DEFAULT '{}',
  is_enabled         BOOLEAN     DEFAULT TRUE,
  full_screen_intent BOOLEAN     DEFAULT TRUE,
  last_triggered_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_notification_programs_updated_at
  BEFORE UPDATE ON notification_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_notification_programs_user_id ON notification_programs(user_id);

-- ═══════════════════════ ROW LEVEL SECURITY ══════════════════
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_subjects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_programs ENABLE ROW LEVEL SECURITY;

-- Helper: authenticated user owns row
CREATE OR REPLACE FUNCTION is_owner(row_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth.uid() = row_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- user_profiles uses "id" as the user FK (not "user_id")
CREATE POLICY "owner_all_user_profiles" ON user_profiles
  FOR ALL TO authenticated
  USING  (is_owner(id))
  WITH CHECK (is_owner(id));

-- All other tables use "user_id"
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tasks','transactions','savings_goals',
    'learning_subjects','learning_sessions','notes','habits',
    'habit_completions','goals','goal_milestones','devices',
    'device_activity_logs','ai_chat_history'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "owner_all_%I" ON %I
       FOR ALL TO authenticated
       USING (is_owner(user_id))
       WITH CHECK (is_owner(user_id));',
      tbl, tbl
    );
  END LOOP;
END;
$$;

CREATE POLICY "owner_all_notification_programs" ON notification_programs
  FOR ALL TO authenticated
  USING (is_owner(user_id))
  WITH CHECK (is_owner(user_id));

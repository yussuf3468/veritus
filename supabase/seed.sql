-- ══════════════════════════════════════════════════════════
--  VERITUS — Seed Data  (run AFTER schema.sql)
--  Replace 'YOUR_USER_UUID' with an actual auth.users id
-- ══════════════════════════════════════════════════════════

-- This seed is for local development only.
-- In production, data is created through the app.

-- Example: insert a test task (replace user id after signing up)
/*
INSERT INTO tasks (user_id, title, description, priority, status, tags)
VALUES
  ('YOUR_USER_UUID', 'Set up Veritus project',      'Deploy the full-stack app',       'urgent', 'in_progress', ARRAY['setup','dev']),
  ('YOUR_USER_UUID', 'Configure Supabase tables',   'Run schema.sql in SQL editor',    'high',   'completed',   ARRAY['database']),
  ('YOUR_USER_UUID', 'Add OpenAI key to .env',      'Enable AI Command Center',        'high',   'pending',     ARRAY['ai']),
  ('YOUR_USER_UUID', 'Review money tracker module', 'Test income/expense logging',     'medium', 'pending',     ARRAY['money']),
  ('YOUR_USER_UUID', 'Build first habit streak',    'Log daily for 7 consecutive days','low',    'pending',     ARRAY['habits']);

INSERT INTO habits (user_id, name, description, color, icon)
VALUES
  ('YOUR_USER_UUID', 'Morning workout',  '30 min exercise',          '#00ff88', '💪'),
  ('YOUR_USER_UUID', 'Deep work block',  '2 hrs focused coding',     '#00d4ff', '🧠'),
  ('YOUR_USER_UUID', 'Read 20 pages',    'Non-fiction reading daily','#7c3aed', '📖'),
  ('YOUR_USER_UUID', 'Arabic practice',  'Duolingo or Anki, 15 min', '#fb923c', '🌙');

INSERT INTO learning_subjects (user_id, name, category, description, target_hours, color)
VALUES
  ('YOUR_USER_UUID', 'JavaScript',  'Programming',  'ES2024 mastery',           200, '#f7df1e'),
  ('YOUR_USER_UUID', 'AI / ML',     'Technology',   'LLMs, agents, RAG',        150, '#00d4ff'),
  ('YOUR_USER_UUID', 'Arabic',      'Language',     'Modern Standard Arabic',   300, '#00ff88'),
  ('YOUR_USER_UUID', 'System Design','Engineering',  'Scalable architectures',  100, '#7c3aed');

INSERT INTO goals (user_id, title, description, type, deadline, category, progress)
VALUES
  ('YOUR_USER_UUID', 'Launch Veritus v1',         'Full production deployment', 'short_term', CURRENT_DATE + 30,  'Tech',     10),
  ('YOUR_USER_UUID', 'Reach $5k MRR',             'SaaS or freelance income',  'long_term',  CURRENT_DATE + 365, 'Finance',   5),
  ('YOUR_USER_UUID', 'Fluent in Arabic',           'B2 level proficiency',      'long_term',  CURRENT_DATE + 547, 'Learning',  8),
  ('YOUR_USER_UUID', 'Consistent exercise habit',  '90-day streak',             'short_term', CURRENT_DATE + 90,  'Health',   22);
*/

SELECT 'Seed file loaded — uncomment the inserts after your first signup.' AS status;

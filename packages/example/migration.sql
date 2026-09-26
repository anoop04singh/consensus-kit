-- Example only — replace with your application's domain tables.
CREATE TABLE IF NOT EXISTS example_tasks (
  task_id text PRIMARY KEY,
  title text NOT NULL
);
ALTER TABLE example_tasks ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON example_tasks FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON example_tasks FROM authenticated;
  END IF;
END $$;

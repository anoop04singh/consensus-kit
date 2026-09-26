CREATE TABLE IF NOT EXISTS consensus_events (
  event_id uuid PRIMARY KEY,
  stream text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash char(64) NOT NULL,
  topic_id text NOT NULL,
  sequence_number bigint NOT NULL,
  consensus_timestamp text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS consensus_events_stream_entity_idx ON consensus_events (stream, entity_id);

CREATE TABLE IF NOT EXISTS consensus_checkpoints (
  topic_id text PRIMARY KEY,
  last_sequence_number bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- These tables are backend-owned. On Supabase, public is an exposed API schema.
-- No browser/Data API role should read or write them without an explicit app policy.
ALTER TABLE consensus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE consensus_checkpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON consensus_events, consensus_checkpoints FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON consensus_events, consensus_checkpoints FROM authenticated;
  END IF;
END $$;

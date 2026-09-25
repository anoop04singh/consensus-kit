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

-- Example projection only. Replace with application tables.
CREATE TABLE IF NOT EXISTS example_tasks (
  task_id text PRIMARY KEY,
  title text NOT NULL
);

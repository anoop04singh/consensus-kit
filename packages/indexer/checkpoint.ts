import type { DatabaseClient } from '../database/schema.js';

export async function lockCheckpoint(db: DatabaseClient, topicId: string): Promise<number> {
  await db.query('INSERT INTO consensus_checkpoints (topic_id) VALUES ($1) ON CONFLICT DO NOTHING', [topicId]);
  const result = await db.query('SELECT last_sequence_number FROM consensus_checkpoints WHERE topic_id = $1 FOR UPDATE', [topicId]);
  return Number(result.rows[0].last_sequence_number);
}

export async function advanceCheckpoint(db: DatabaseClient, topicId: string, sequence: number) {
  await db.query('UPDATE consensus_checkpoints SET last_sequence_number = $2, updated_at = now() WHERE topic_id = $1', [topicId, sequence]);
}

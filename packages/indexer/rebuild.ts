import 'dotenv/config';
import config from '../../consensus.config.js';
import { requireDatabaseUrl, requireTopicId } from '../consensus/config.js';
import { createPool } from '../database/schema.js';
import { indexBatch } from './worker.js';
import { resetProjections } from './projector.js';

export async function rebuild() {
  const topicId = requireTopicId(config);
  const pool = createPool(requireDatabaseUrl(config));
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await resetProjections(db);
    await db.query('DELETE FROM consensus_events WHERE topic_id = $1', [topicId]);
    await db.query('DELETE FROM consensus_checkpoints WHERE topic_id = $1', [topicId]);
    await db.query('COMMIT');
    let total = 0;
    for (;;) {
      const count = await indexBatch(pool, config);
      total += count;
      if (count < 100) break;
    }
    console.log(`Rebuilt ${total} events from HCS`);
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { db.release(); await pool.end(); }
}

import 'dotenv/config';
import type pg from 'pg';
import config from '../../consensus.config.js';
import { requireDatabaseUrl, requireTopicId, type ConsensusConfig } from '../consensus/config.js';
import { hashPayload } from '../consensus/hash.js';
import { createPool } from '../database/schema.js';
import { advanceCheckpoint, lockCheckpoint } from './checkpoint.js';
import { decodeMirrorEvent, listMessages, type MirrorMessage } from './mirror-node.js';
import { project } from './projector.js';
import '../example/projector.js';

export async function indexMessage(pool: pg.Pool, topicId: string, row: MirrorMessage): Promise<'indexed' | 'already-indexed' | 'duplicate'> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const checkpoint = await lockCheckpoint(db, topicId);
    if (row.sequenceNumber <= checkpoint) {
      await db.query('COMMIT');
      return 'already-indexed';
    }
    if (row.sequenceNumber !== checkpoint + 1) throw new Error(`Sequence gap: expected ${checkpoint + 1}, got ${row.sequenceNumber}`);
    const event = decodeMirrorEvent(row);
    if (event.payloadHash !== hashPayload(event.payload)) throw new Error(`Payload hash mismatch at sequence ${row.sequenceNumber}`);
    const result = await db.query(
      `INSERT INTO consensus_events
       (event_id, stream, entity_id, event_type, payload_hash, topic_id, sequence_number, consensus_timestamp, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.eventId, event.stream, event.entityId, event.type, event.payloadHash, topicId, row.sequenceNumber, row.consensusTimestamp, event.metadata ?? null]
    );
    if (result.rowCount !== 1) {
      await advanceCheckpoint(db, topicId, row.sequenceNumber);
      await db.query('COMMIT');
      return 'duplicate';
    }
    await project(event, db);
    await advanceCheckpoint(db, topicId, row.sequenceNumber);
    await db.query('COMMIT');
    return 'indexed';
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

export async function indexBatch(pool: pg.Pool, settings: ConsensusConfig): Promise<number> {
  const topicId = requireTopicId(settings);
  const checkpoint = await pool.query('SELECT last_sequence_number FROM consensus_checkpoints WHERE topic_id = $1', [topicId]);
  const last = Number(checkpoint.rows[0]?.last_sequence_number ?? 0);
  const messages = await listMessages(settings.mirrorNode, topicId, last);
  for (const message of messages) await indexMessage(pool, topicId, message);
  return messages.length;
}

export async function runIndexer(settings = config): Promise<void> {
  const pool = createPool(requireDatabaseUrl(settings));
  console.log(`Indexing HCS topic ${requireTopicId(settings)}`);
  try {
    for (;;) {
      const count = await indexBatch(pool, settings);
      if (count === 0) await new Promise(resolve => setTimeout(resolve, settings.indexer.intervalMs));
    }
  } finally { await pool.end(); }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/packages/indexer/worker.ts')) {
  runIndexer().catch(error => { console.error(error); process.exitCode = 1; });
}

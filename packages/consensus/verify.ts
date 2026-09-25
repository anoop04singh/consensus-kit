import type { ConsensusConfig } from './config.js';
import { requireDatabaseUrl } from './config.js';
import { createPool } from '../database/schema.js';
import { getMessage } from '../indexer/mirror-node.js';
import { hashPayload } from './hash.js';
import { decodeEvent } from './schema.js';

export async function verify(config: ConsensusConfig, eventId: string) {
  const pool = createPool(requireDatabaseUrl(config));
  try {
    const result = await pool.query('SELECT * FROM consensus_events WHERE event_id = $1', [eventId]);
    const stored = result.rows[0];
    if (!stored) return { verified: false, reason: 'Event is not indexed' };
    const message = await getMessage(config.mirrorNode, stored.topic_id, Number(stored.sequence_number));
    if (!message) return { verified: false, reason: 'Mirror Node message not found' };
    let event;
    try { event = decodeEvent(message.message); }
    catch { return { verified: false, reason: 'Invalid HCS envelope' }; }
    const verified = event.eventId === stored.event_id &&
      event.stream === stored.stream && event.entityId === stored.entity_id && event.type === stored.event_type &&
      event.payloadHash === stored.payload_hash && event.payloadHash === hashPayload(event.payload) &&
      stored.topic_id === config.topicId && message.sequenceNumber === Number(stored.sequence_number) &&
      message.consensusTimestamp === stored.consensus_timestamp;
    return {
      verified,
      topicId: stored.topic_id,
      sequenceNumber: Number(stored.sequence_number),
      consensusTimestamp: stored.consensus_timestamp,
      ...(verified ? {} : { reason: 'Indexed metadata or payload hash differs from HCS' })
    };
  } finally { await pool.end(); }
}

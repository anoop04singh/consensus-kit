import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPayload } from '../packages/consensus/hash.js';
import { indexMessage } from '../packages/indexer/worker.js';
import { clearProjectorsForTest, registerProjector } from '../packages/indexer/projector.js';

const event = {
  version: 1, eventId: 'cf4b9e29-b18e-4e73-a87d-38c4871a8142',
  stream: 'orders', entityId: 'order_1', type: 'ORDER_CREATED',
  payload: { total: 5 }, payloadHash: hashPayload({ total: 5 }), timestamp: '2026-01-01T00:00:00.000Z'
};
function database() {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith('SELECT last_sequence_number')) return { rows: [{ last_sequence_number: '0' }] };
    return { rows: [], rowCount: 1 };
  });
  const release = vi.fn();
  return { query, release, pool: { connect: async () => ({ query, release }) } as never };
}

describe('indexer failure boundaries', () => {
  beforeEach(clearProjectorsForTest);
  it('does not advance the checkpoint when a projector fails', async () => {
    const db = database();
    registerProjector({ stream: 'orders', handlers: { ORDER_CREATED: async () => { throw new Error('projection failed'); } } });
    await expect(indexMessage(db.pool, '0.0.123', {
      sequenceNumber: 1, consensusTimestamp: '1.000000001', message: JSON.stringify(event)
    })).rejects.toThrow('projection failed');
    expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE consensus_checkpoints'))).toBe(false);
    expect(db.release).toHaveBeenCalled();
  });
  it.each([
    { sequence: 2, body: event, error: 'Sequence gap' },
    { sequence: 1, body: { ...event, payload: { total: 999 } }, error: 'Payload hash mismatch' }
  ])('blocks a sequence gap or altered payload: $error', async ({ sequence, body, error }) => {
    const db = database();
    await expect(indexMessage(db.pool, '0.0.123', {
      sequenceNumber: sequence, consensusTimestamp: '1.000000001', message: JSON.stringify(body)
    })).rejects.toThrow(error);
    expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    expect(db.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO consensus_events'))).toBe(false);
  });
});

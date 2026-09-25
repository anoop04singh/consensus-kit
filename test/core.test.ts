import { describe, expect, it, beforeEach, vi } from 'vitest';
import { canonicalize, hashPayload } from '../packages/consensus/hash.js';
import { decodeEvent, publishInputSchema } from '../packages/consensus/schema.js';
import { decodeMirrorEvent, listMessages } from '../packages/indexer/mirror-node.js';
import { clearProjectorsForTest, project, registerProjector } from '../packages/indexer/projector.js';
import { indexMessage } from '../packages/indexer/worker.js';

const event = {
  version: 1 as const,
  eventId: 'cf4b9e29-b18e-4e73-a87d-38c4871a8142',
  stream: 'orders', entityId: 'order_1', type: 'ORDER_CREATED',
  payload: { b: 2, a: 1 }, payloadHash: hashPayload({ a: 1, b: 2 }),
  timestamp: '2026-01-01T00:00:00.000Z'
};

describe('event contract', () => {
  it('hashes JSON objects deterministically', () => {
    expect(canonicalize({ b: 2, a: [1, { z: true, c: null }] })).toBe('{"a":[1,{"c":null,"z":true}],"b":2}');
    expect(hashPayload({ b: 2, a: 1 })).toBe(hashPayload({ a: 1, b: 2 }));
    expect(() => canonicalize({ bad: undefined })).toThrow();
  });
  it('validates generic event input and envelope', () => {
    expect(publishInputSchema.parse({ stream: 'orders', entityId: '1', type: 'CREATED', payload: {} })).toBeDefined();
    expect(() => publishInputSchema.parse({ stream: '', entityId: '1', type: 'CREATED', payload: {} })).toThrow();
    expect(decodeEvent(JSON.stringify(event))).toEqual(event);
    expect(() => decodeEvent(JSON.stringify({ ...event, version: 2 }))).toThrow();
  });
  it('decodes base64 Mirror Node messages in ascending sequence order', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [
      { sequence_number: 1, consensus_timestamp: '1.000000001', message: Buffer.from(JSON.stringify(event)).toString('base64') }
    ] }) });
    try {
      const rows = await listMessages('https://example.com', '0.0.123', 0);
      expect(rows[0].sequenceNumber).toBe(1);
      expect(decodeMirrorEvent(rows[0])).toEqual(event);
      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('order=asc');
    } finally { globalThis.fetch = original; }
  });
});

describe('projector routing', () => {
  beforeEach(clearProjectorsForTest);
  it('runs only the matching stream and event handler', async () => {
    const handler = vi.fn();
    registerProjector({ stream: 'orders', handlers: { ORDER_CREATED: handler } });
    const db = { query: vi.fn() } as never;
    await project(event, db);
    await project({ ...event, stream: 'other' }, db);
    await project({ ...event, type: 'OTHER' }, db);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(() => registerProjector({ stream: 'orders', handlers: {} })).toThrow();
  });
});

describe('indexing guarantees', () => {
  it('deduplicates an event ID without rerunning its projector', async () => {
    const queries: string[] = [];
    const db = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.startsWith('SELECT last_sequence_number')) return { rows: [{ last_sequence_number: '0' }] };
        if (sql.includes('INSERT INTO consensus_events')) return { rowCount: 0 };
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn()
    };
    const pool = { connect: async () => db } as never;
    await expect(indexMessage(pool, '0.0.123', {
      sequenceNumber: 1,
      consensusTimestamp: '1.000000001',
      message: JSON.stringify(event)
    })).resolves.toBe('duplicate');
    expect(queries).toContain('COMMIT');
    expect(queries.some(query => query.startsWith('UPDATE consensus_checkpoints'))).toBe(true);
  });
});

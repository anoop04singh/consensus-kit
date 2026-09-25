import { describe, it, expect } from 'vitest';
import config from '../consensus.config.js';
import { publish } from '../packages/consensus/publish.js';
import { verify } from '../packages/consensus/verify.js';
import { indexBatch } from '../packages/indexer/worker.js';
import { createPool } from '../packages/database/schema.js';
import { getMessage } from '../packages/indexer/mirror-node.js';
import { rebuild } from '../packages/indexer/rebuild.js';

const enabled = process.env.RUN_TESTNET_INTEGRATION === '1';

describe.skipIf(!enabled)('Hedera testnet integration', () => {
  it('publishes, retrieves, indexes, projects, verifies, and replays', async () => {
    const pool = createPool(config.databaseUrl);
    try {
      const entityId = `task_test_${Date.now()}`;
      const result = await publish(config, { stream: 'tasks', entityId, type: 'TASK_CREATED', payload: { title: 'Integration' } });
      let mirror = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        mirror = await getMessage(config.mirrorNode, result.topicId, result.sequenceNumber);
        if (mirror) break;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      expect(mirror).not.toBeNull();
      for (let attempt = 0; attempt < 20; attempt++) {
        await indexBatch(pool, config);
        const indexed = await pool.query('SELECT 1 FROM consensus_events WHERE event_id = $1', [result.eventId]);
        if (indexed.rowCount) break;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      expect((await pool.query('SELECT title FROM example_tasks WHERE task_id = $1', [entityId])).rows[0]?.title).toBe('Integration');
      expect((await verify(config, result.eventId)).verified).toBe(true);
      expect(await indexBatch(pool, config)).toBeGreaterThanOrEqual(0);
      await rebuild();
      expect((await pool.query('SELECT title FROM example_tasks WHERE task_id = $1', [entityId])).rows[0]?.title).toBe('Integration');
    } finally { await pool.end(); }
  }, 120000);
});

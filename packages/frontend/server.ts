import 'dotenv/config';
import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import config from '../../consensus.config.js';
import { createPool } from '../database/schema.js';
import { verify } from '../consensus/verify.js';
import viteConfig from './vite.config.js';

const port = Number(process.env.PORT ?? 3000);
const vite = await createViteServer({ ...viteConfig, server: { middlewareMode: true, host: '127.0.0.1' }, appType: 'spa' });
const pool = config.databaseUrl ? createPool(config.databaseUrl) : null;
const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/api/')) return vite.middlewares(req, res, () => undefined);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (!pool) throw new Error('Set DATABASE_URL and run npm run db:migrate');
    if (req.method === 'GET' && req.url === '/api/overview') {
      const [count, checkpoint, events] = await Promise.all([
        pool.query('SELECT count(*)::int AS count FROM consensus_events WHERE topic_id = $1', [config.topicId]),
        pool.query('SELECT last_sequence_number FROM consensus_checkpoints WHERE topic_id = $1', [config.topicId]),
        pool.query('SELECT event_id, stream, entity_id, event_type, payload_hash, topic_id, sequence_number, consensus_timestamp FROM consensus_events WHERE topic_id = $1 ORDER BY sequence_number DESC LIMIT 50', [config.topicId])
      ]);
      res.end(JSON.stringify({ topicId: config.topicId, network: config.network, indexedEvents: count.rows[0].count, lastSequence: Number(checkpoint.rows[0]?.last_sequence_number ?? 0), events: events.rows }));
    } else if (req.method === 'GET' && /^\/api\/verify\/[0-9a-f-]{36}$/.test(req.url)) {
      res.end(JSON.stringify(await verify(config, req.url.split('/').at(-1)!)));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
  }
});
server.listen(port, '127.0.0.1', () => console.log(`ConsensusKit explorer: http://127.0.0.1:${port}`));

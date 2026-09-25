import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import config from '../consensus.config.js';
import { createPool } from '../packages/database/schema.js';
import { requireDatabaseUrl } from '../packages/consensus/config.js';

const pool = createPool(requireDatabaseUrl(config));
try {
  const path = fileURLToPath(new URL('../packages/database/migrations/001_initial.sql', import.meta.url));
  await pool.query(await readFile(path, 'utf8'));
  console.log('Database migrated');
} finally { await pool.end(); }

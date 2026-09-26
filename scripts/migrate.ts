import 'dotenv/config';
import config from '../consensus.config.js';
import { requireDatabaseUrl } from '../packages/consensus/config.js';
import { migrateDatabase } from './migrations.js';

await migrateDatabase(requireDatabaseUrl(config));
console.log('Database migrated');

import 'dotenv/config';
import { defineConsensusConfig } from './packages/consensus/config.js';

export default defineConsensusConfig({
  network: 'testnet',
  topicId: process.env.HEDERA_TOPIC_ID ?? '',
  mirrorNode: 'https://testnet.mirrornode.hedera.com',
  databaseUrl: process.env.DATABASE_URL ?? '',
  indexer: { intervalMs: 3000 }
});

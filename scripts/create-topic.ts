import 'dotenv/config';
import config from '../consensus.config.js';
import { createTopic } from '../packages/consensus/topic.js';

console.log(`Topic created: ${await createTopic(config)}`);
console.log('Add this to HEDERA_TOPIC_ID, or use npm run setup to save it automatically');

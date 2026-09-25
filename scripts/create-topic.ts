import 'dotenv/config';
import { TopicCreateTransaction } from '@hiero-ledger/sdk';
import config from '../consensus.config.js';
import { createHederaClient } from '../packages/consensus/client.js';

const client = createHederaClient(config);
try {
  const response = await new TopicCreateTransaction().setTopicMemo('ConsensusKit event stream').execute(client);
  const receipt = await response.getReceipt(client);
  if (!receipt.topicId) throw new Error('Topic creation receipt had no topic ID');
  console.log(`Topic created: ${receipt.topicId.toString()}`);
  console.log('Add this to HEDERA_TOPIC_ID');
} finally { client.close(); }

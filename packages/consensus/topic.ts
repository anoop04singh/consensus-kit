import { TopicCreateTransaction } from '@hiero-ledger/sdk';
import type { ConsensusConfig } from './config.js';
import { createHederaClient } from './client.js';

export async function createTopic(config: ConsensusConfig): Promise<string> {
  const client = createHederaClient(config);
  try {
    const response = await new TopicCreateTransaction()
      .setTopicMemo('ConsensusKit event stream')
      .setSubmitKey(client.operatorPublicKey!)
      .execute(client);
    const receipt = await response.getReceipt(client);
    if (!receipt.topicId) throw new Error('Topic creation receipt had no topic ID');
    return receipt.topicId.toString();
  } finally { client.close(); }
}

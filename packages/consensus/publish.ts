import { randomUUID } from 'node:crypto';
import { TopicMessageSubmitTransaction, TopicId } from '@hiero-ledger/sdk';
import type { ConsensusConfig } from './config.js';
import { requireTopicId } from './config.js';
import { createHederaClient } from './client.js';
import { hashPayload } from './hash.js';
import { publishInputSchema, type ConsensusEvent, type PublishInput } from './schema.js';

export async function publish<T>(config: ConsensusConfig, input: PublishInput<T>) {
  const parsed = publishInputSchema.parse(input);
  const topicId = requireTopicId(config);
  const event: ConsensusEvent<T> = {
    version: 1,
    eventId: randomUUID(),
    stream: parsed.stream,
    entityId: parsed.entityId,
    type: parsed.type,
    payload: input.payload,
    payloadHash: hashPayload(input.payload),
    ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
    timestamp: new Date().toISOString()
  };
  const message = JSON.stringify(event);
  if (Buffer.byteLength(message, 'utf8') > 1024) {
    throw new Error('HCS message exceeds 1024 bytes; store large payloads elsewhere and publish a compact reference');
  }
  const client = createHederaClient(config);
  try {
    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message)
      .execute(client);
    const receipt = await response.getReceipt(client);
    return { eventId: event.eventId, transactionId: response.transactionId.toString(), topicId, sequenceNumber: Number(receipt.topicSequenceNumber?.toString()) };
  } finally {
    client.close();
  }
}

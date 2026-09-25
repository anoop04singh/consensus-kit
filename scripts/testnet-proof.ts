import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import config from '../consensus.config.js';
import { requireDatabaseUrl } from '../packages/consensus/config.js';
import { createPool } from '../packages/database/schema.js';
import { publish } from '../packages/consensus/publish.js';
import { verify } from '../packages/consensus/verify.js';
import { decodeMirrorEvent, getMessage } from '../packages/indexer/mirror-node.js';
import { indexBatch } from '../packages/indexer/worker.js';

if (config.network !== 'testnet') throw new Error('The proof command requires testnet');
const pool = createPool(requireDatabaseUrl(config));
try {
  const published = await publish(config, {
    stream: 'tasks', entityId: `proof_${Date.now()}`, type: 'TASK_CREATED',
    payload: { title: 'ConsensusKit testnet proof' }
  });
  let message = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    message = await getMessage(config.mirrorNode, published.topicId, published.sequenceNumber);
    if (message) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!message) throw new Error('Message has not appeared on Mirror Node');
  let verified = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await indexBatch(pool, config);
    const result = await verify(config, published.eventId);
    if (result.verified) { verified = true; break; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!verified) throw new Error('Event was not indexed and verified');
  const event = decodeMirrorEvent(message);
  const evidence = {
    network: 'testnet',
    topicId: published.topicId,
    sequenceNumber: published.sequenceNumber,
    eventId: published.eventId,
    payloadHash: event.payloadHash,
    transactionId: published.transactionId,
    consensusTimestamp: message.consensusTimestamp,
    mirrorNodeUrl: `${config.mirrorNode}/api/v1/topics/${published.topicId}/messages/${published.sequenceNumber}`,
    hashscanUrl: `https://hashscan.io/testnet/topic/${published.topicId}`,
    verified: true
  };
  await writeFile('testnet-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log('Wrote testnet-evidence.json with public HCS and Mirror Node proof');
} finally { await pool.end(); }

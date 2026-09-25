export type ConsensusConfig = {
  network: 'testnet' | 'mainnet';
  topicId: string;
  mirrorNode: string;
  databaseUrl: string;
  indexer: { intervalMs: number };
};

export function defineConsensusConfig(config: ConsensusConfig): ConsensusConfig {
  if (!Number.isSafeInteger(config.indexer.intervalMs) || config.indexer.intervalMs < 100) {
    throw new Error('indexer.intervalMs must be at least 100 ms');
  }
  return config;
}

export function requireTopicId(config: ConsensusConfig): string {
  if (!/^0\.0\.[0-9]+$/.test(config.topicId)) throw new Error('Set HEDERA_TOPIC_ID to a valid 0.0.x topic');
  return config.topicId;
}

export function requireDatabaseUrl(config: ConsensusConfig): string {
  if (!config.databaseUrl) throw new Error('Set DATABASE_URL');
  return config.databaseUrl;
}

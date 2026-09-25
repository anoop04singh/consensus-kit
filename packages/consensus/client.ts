import { AccountId, Client, PrivateKey } from '@hiero-ledger/sdk';
import type { ConsensusConfig } from './config.js';

export function createHederaClient(config: ConsensusConfig): Client {
  const id = process.env.HEDERA_ACCOUNT_ID;
  const key = process.env.HEDERA_PRIVATE_KEY;
  if (!id || !key) throw new Error('Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY');
  const client = config.network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(AccountId.fromString(id), PrivateKey.fromString(key));
  return client;
}

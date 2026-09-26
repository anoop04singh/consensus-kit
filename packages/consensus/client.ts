import { AccountId, Client, PrivateKey } from '@hiero-ledger/sdk';
import type { ConsensusConfig } from './config.js';

export function parsePrivateKey(key: string, keyType?: string): PrivateKey {
  if (keyType && !['ecdsa', 'ed25519', 'der'].includes(keyType)) throw new Error('HEDERA_KEY_TYPE must be ecdsa, ed25519, or der');
  return keyType === 'ecdsa' || (!keyType && key.startsWith('0x'))
    ? PrivateKey.fromStringECDSA(key)
    : keyType === 'der' || (!keyType && /^30(?:2e|30)/i.test(key))
      ? PrivateKey.fromStringDer(key)
      : PrivateKey.fromStringED25519(key);
}

export function createHederaClient(config: ConsensusConfig): Client {
  const id = process.env.HEDERA_ACCOUNT_ID;
  const key = process.env.HEDERA_PRIVATE_KEY;
  if (!id || !key) throw new Error('Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY');
  const client = config.network === 'testnet' ? Client.forTestnet() : Client.forMainnet();
  const keyType = process.env.HEDERA_KEY_TYPE;
  const privateKey = parsePrivateKey(key, keyType);
  client.setOperator(AccountId.fromString(id), privateKey);
  return client;
}

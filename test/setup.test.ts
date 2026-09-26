import { describe, expect, it } from 'vitest';
import { parse } from 'dotenv';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrivateKey } from '@hiero-ledger/sdk';
import { mergeEnv, saveEnvFile, validateDatabaseUrl } from '../scripts/setup-env.js';
import { parsePrivateKey } from '../packages/consensus/client.js';

describe('interactive setup configuration', () => {
  it('preserves unrelated settings and safely round-trips URL punctuation', () => {
    const url = 'postgresql://demo:p%40ss%23word@localhost:5432/demo?sslmode=require';
    const result = mergeEnv('# personal setting\nPORT=4321\nDATABASE_URL=old\nHEDERA_PRIVATE_KEY=old\n', {
      DATABASE_URL: url, HEDERA_PRIVATE_KEY: '0x0123', HEDERA_TOPIC_ID: '0.0.123'
    });
    expect(parse(result)).toEqual({ PORT: '4321', DATABASE_URL: url, HEDERA_PRIVATE_KEY: '0x0123', HEDERA_TOPIC_ID: '0.0.123' });
    expect(result).toContain('# personal setting');
  });
  it('rejects newline injection and non-Postgres URLs', () => {
    expect(() => mergeEnv('', { DATABASE_URL: 'value\nINJECTED=yes' })).toThrow();
    expect(validateDatabaseUrl('https://project.supabase.co')).not.toBe(true);
    expect(validateDatabaseUrl('postgresql://user:password@localhost:5432/demo')).toBe(true);
  });
  it('saves a topic after setup without losing the existing credentials', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consensuskit-setup-'));
    try {
      const path = join(dir, '.env');
      await writeFile(path, 'HEDERA_PRIVATE_KEY=local-test-value\nPORT=3001\n');
      await saveEnvFile(path, { HEDERA_TOPIC_ID: '0.0.123' });
      expect(parse(await readFile(path, 'utf8'))).toEqual({
        HEDERA_PRIVATE_KEY: 'local-test-value', PORT: '3001', HEDERA_TOPIC_ID: '0.0.123'
      });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('parses explicitly selected key formats without changing their public key', () => {
    for (const type of ['ecdsa', 'ed25519'] as const) {
      const original = type === 'ecdsa' ? PrivateKey.generateECDSA() : PrivateKey.generateED25519();
      expect(parsePrivateKey(original.toStringRaw(), type).publicKey.toStringRaw()).toBe(original.publicKey.toStringRaw());
      expect(parsePrivateKey(original.toStringDer(), 'der').publicKey.toStringRaw()).toBe(original.publicKey.toStringRaw());
    }
  });
});

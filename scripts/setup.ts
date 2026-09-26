import { input, password, select, checkbox, confirm } from '@inquirer/prompts';
import { parse } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { parsePrivateKey } from '../packages/consensus/client.js';
import { createTopic } from '../packages/consensus/topic.js';
import { defineConsensusConfig } from '../packages/consensus/config.js';
import { createPool } from '../packages/database/schema.js';
import { migrateDatabase } from './migrations.js';
import { readEnvFile, saveEnvFile, validateDatabaseUrl } from './setup-env.js';

const usage =
  'Usage: npm run setup [-- --output-env path]\nInteractive testnet setup: account ID, masked key, database URL, topic, and optional migration.\nExisting secrets can be kept without redisplaying them. Ctrl+C cancels before saving.';

async function setup() {
  if (process.argv.includes('--help')) {
    console.log(usage);
    return;
  }
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output-env')) throw new Error('usage');
  if (!process.stdin.isTTY) {
    console.error('Run npm run setup in an interactive terminal. Use --help for usage.');
    process.exitCode = 1;
    return;
  }
  const envPath = resolve(args[1] ?? '.env');
  const existing = parse(await readEnvFile(envPath));
  console.log('\n  ConsensusKit · interactive setup\n  Network: Hedera testnet\n');
  if (Object.keys(existing).length)
    console.log('Existing configuration found. Press Enter to keep its suggested values.\n');
  const accountId = await input({
    message: 'Hedera testnet account ID',
    default: existing.HEDERA_ACCOUNT_ID,
    validate: (value) =>
      /^0\.0\.[1-9][0-9]*$/.test(value.trim()) || 'Use an account ID such as 0.0.12345.',
  });
  const keyType = await select({
    message: 'Private key format',
    default:
      existing.HEDERA_KEY_TYPE || (existing.HEDERA_PRIVATE_KEY?.startsWith('30') ? 'der' : 'ecdsa'),
    choices: [
      { name: 'ECDSA (wallet / 0x key)', value: 'ecdsa' },
      { name: 'ED25519 (raw hex)', value: 'ed25519' },
      { name: 'DER encoded key', value: 'der' },
    ],
  });
  const keepKey =
    existing.HEDERA_PRIVATE_KEY &&
    (await confirm({ message: 'Keep the saved private key?', default: true }));
  const privateKey = keepKey
    ? existing.HEDERA_PRIVATE_KEY
    : await password({
        message: 'Hedera private key (hidden)',
        mask: '*',
        validate: (value) => {
          try {
            parsePrivateKey(value.trim(), keyType);
            return true;
          } catch {
            return 'The key is invalid for the selected format. Check its format and try again.';
          }
        },
      });
  try {
    parsePrivateKey(privateKey.trim(), keyType);
  } catch {
    throw new Error('key-format');
  }
  const provider = await select({
    message: 'PostgreSQL database provider',
    default: existing.DATABASE_URL?.includes('supabase.') ? 'supabase' : 'postgres',
    choices: [
      { name: 'Supabase', value: 'supabase' },
      { name: 'Local PostgreSQL / another provider', value: 'postgres' },
    ],
  });
  if (provider === 'supabase')
    console.log(
      'Copy the URI from Supabase → Connect. Session pooler (5432) works on IPv4 networks.',
    );
  const keepDatabase =
    existing.DATABASE_URL &&
    (await confirm({ message: 'Keep the saved database URL?', default: true }));
  const databaseInput = keepDatabase
    ? existing.DATABASE_URL
    : await password({
        message: 'Database connection URL (hidden)',
        mask: '*',
        validate: validateDatabaseUrl,
      });
  if (validateDatabaseUrl(databaseInput.trim()) !== true) throw new Error('database-url');
  const database = new URL(databaseInput.trim());
  if (provider === 'supabase') {
    const tls = await select({
      message: 'Database TLS',
      default: 'certificate',
      choices: [
        {
          name: 'Verify server using a Supabase root certificate (recommended)',
          value: 'certificate',
        },
        { name: 'Verify server using system certificates', value: 'system' },
        { name: 'Encrypt only (demo; does not verify server identity)', value: 'demo' },
      ],
    });
    if (tls === 'certificate') {
      console.log('Download the server root certificate from Supabase → Database settings → SSL.');
      const certificate = await input({
        message: 'Path to the downloaded root certificate',
        default: database.searchParams.get('sslrootcert') ?? undefined,
        validate: (value) =>
          (!!value.trim() && existsSync(resolve(value.trim()))) ||
          'Enter the path to an existing certificate file.',
      });
      database.searchParams.set('sslrootcert', resolve(certificate.trim()));
    } else {
      database.searchParams.delete('sslrootcert');
    }
    database.searchParams.set('sslmode', tls === 'demo' ? 'require' : 'verify-full');
    if (tls === 'demo') database.searchParams.set('uselibpqcompat', 'true');
    else database.searchParams.delete('uselibpqcompat');
  }
  const topicMode = await select({
    message: 'HCS topic',
    default: existing.HEDERA_TOPIC_ID ? 'existing' : 'create',
    choices: [
      { name: 'Create a new testnet topic now (uses testnet HBAR)', value: 'create' },
      { name: 'Use an existing topic', value: 'existing' },
      { name: 'Configure the topic later', value: 'later' },
    ],
  });
  let topicId =
    topicMode === 'existing'
      ? await input({
          message: 'HCS topic ID',
          default: existing.HEDERA_TOPIC_ID,
          validate: (value) =>
            /^0\.0\.[1-9][0-9]*$/.test(value.trim()) || 'Use a topic ID such as 0.0.12345.',
        })
      : '';
  const steps = await checkbox({
    message: 'Database setup (Space selects, Enter continues)',
    choices: [
      { name: 'Test the database connection', value: 'check', checked: true },
      {
        name: 'Create/update tables from your registered migrations',
        value: 'migrate',
        checked: true,
      },
    ],
  });
  console.log(
    '\nReview: account ' +
      accountId.trim() +
      ', key format ' +
      keyType +
      ', topic ' +
      (topicMode === 'existing' ? topicId : topicMode),
  );
  console.log('Private key and database URL will be saved only to ' + envPath);
  if (
    !(await confirm({
      message: 'Save configuration and run the selected setup steps?',
      default: true,
    }))
  ) {
    console.log('Setup cancelled. No configuration was written.');
    return;
  }
  const values = {
    HEDERA_ACCOUNT_ID: accountId.trim(),
    HEDERA_PRIVATE_KEY: privateKey.trim(),
    HEDERA_KEY_TYPE: keyType,
    HEDERA_TOPIC_ID: topicId.trim(),
    DATABASE_URL: database.toString(),
  };
  await saveEnvFile(envPath, values);
  Object.assign(process.env, values);
  console.log('Configuration saved.');
  // Build config after prompting; never import a config evaluated before the new values exist.
  const config = defineConsensusConfig({
    network: 'testnet',
    topicId,
    databaseUrl: values.DATABASE_URL,
    mirrorNode: 'https://testnet.mirrornode.hedera.com',
    indexer: { intervalMs: 3000 },
  });
  if (steps.includes('check')) {
    const pool = createPool(values.DATABASE_URL);
    try {
      await pool.query('SELECT 1');
      console.log('Database connection verified.');
    } finally {
      await pool.end();
    }
  }
  if (steps.includes('migrate')) {
    await migrateDatabase(values.DATABASE_URL);
    console.log('Database tables ready.');
  }
  if (topicMode === 'create') {
    topicId = await createTopic(config);
    await saveEnvFile(envPath, { HEDERA_TOPIC_ID: topicId });
    console.log('Topic created and saved: ' + topicId);
  }
  console.log(
    '\nSetup complete.' +
      (!topicId ? ' Run npm run setup again to configure a topic before publishing.' : ''),
  );
  console.log(
    'Next: npm run consensus:indexer\nIn another terminal: npm run dev\nCustomize events and projectors: docs/customization.md\nOptional tasks example: npm run example:publish\n',
  );
}

setup().catch((error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('\nSetup cancelled.');
    process.exitCode = 130;
    return;
  }
  // SDK/driver messages may contain connection strings or keys. Print only a safe code.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const safeCode = /^[A-Z0-9_]{1,40}$/.test(code) ? ' (' + code + ')' : '';
  console.error(
    'Setup could not finish' +
      safeCode +
      '. Check your connection, credentials, and key format, then rerun npm run setup.',
  );
  console.error('Any settings already saved remain in the selected environment file.\n' + usage);
  process.exitCode = 1;
});

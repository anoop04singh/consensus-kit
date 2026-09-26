# Mainnet setup

[Documentation home](../README.md)

ConsensusKit's core supports mainnet topic creation, publishing, indexing, verification, and replay. Mainnet uses manual configuration. The interactive setup wizard and public evidence command target testnet.

The included live integration evidence covers testnet; it does not certify a mainnet deployment.

## 1. Prepare a separate environment

Use a separate project directory and database for mainnet. Keep testnet credentials, checkpoints, and projections isolated.

You need:

- A mainnet account funded with HBAR.
- Its private key and key format.
- A PostgreSQL database dedicated to the mainnet application.
- A new mainnet topic, or an existing topic whose submit key accepts your configured operator's signature.

Creating topics and publishing messages on mainnet incur real HBAR fees. HCS messages are publicly readable. See [Hedera network fees](https://docs.hedera.com/networks/fees) for fee information.

Start from a source checkout:

```bash
git clone https://github.com/anoop04singh/consensus-kit.git consensus-kit-mainnet
cd consensus-kit-mainnet
npm ci
```

Do not run `npm run setup` in this environment. It creates a testnet client regardless of the network in `consensus.config.ts`. A scaffolder network option alone does not replace the manual configuration below.

## 2. Configure the mainnet network

Set `consensus.config.ts` to:

```ts
import 'dotenv/config';
import { defineConsensusConfig } from './packages/consensus/config.js';

export default defineConsensusConfig({
  network: 'mainnet',
  topicId: process.env.HEDERA_TOPIC_ID ?? '',
  mirrorNode: 'https://mainnet.mirrornode.hedera.com',
  databaseUrl: process.env.DATABASE_URL ?? '',
  indexer: { intervalMs: 3000 },
});
```

The SDK client uses `Client.forMainnet()` when the configured network is mainnet. The indexer and verification use the explicit Mirror Node URL. The explorer generates mainnet Hashscan links from the same network setting.

The [mainnet Mirror Node API reference](https://mainnet.mirrornode.hedera.com/api/v1/docs/) documents the public endpoint. For a deployed application, choose a Mirror Node service with the history availability and capacity your application requires.

## 3. Set credentials

Copy `.env.example` to `.env` and set these values locally:

```dotenv
HEDERA_ACCOUNT_ID=<mainnet-account-id>
HEDERA_PRIVATE_KEY=<mainnet-private-key>
HEDERA_KEY_TYPE=<ecdsa-or-ed25519-or-der>
HEDERA_TOPIC_ID=
DATABASE_URL=<mainnet-application-postgresql-uri>
PORT=3000
```

Replace every placeholder. Use a topic ID from mainnet if you already have one; otherwise leave it empty until the next step. Account and topic IDs do not encode the network, so confirm which network each belongs to.

Keep secrets out of Git and frontend code. Existing process environment variables take precedence over values loaded from `.env`; ensure your shell or deployment environment does not inject testnet settings.

For database URI and certificate options, see [Configuration](configuration.md). Configure TLS verification directly in the mainnet database URI; do not use the testnet wizard to edit this environment.

## 4. Initialize the database and topic

Run the registered database initialization SQL:

```bash
npm run db:migrate
```

If you need a topic, create it with the standalone command:

```bash
npm run consensus:topic:create
```

This command uses the network in `consensus.config.ts` and pays with the configured operator account. It prints the topic ID. Save that ID as `HEDERA_TOPIC_ID` in `.env`.

New topics use the operator public key as their submit key. Reads through Mirror Node remain public.

## 5. Start and verify

Start one indexer:

```bash
npm run consensus:indexer
```

In another terminal, start the local explorer:

```bash
npm run dev
```

When ready to submit a real mainnet message, publish through your application or run:

```bash
npm run example:publish
```

The example command incurs a mainnet transaction fee and records its task payload publicly. Wait for Mirror Node ingestion, refresh the explorer at `http://127.0.0.1:3000`, select the event, and verify it. Its Hashscan link should point to the mainnet network.

Programmatic verification uses the same API:

```ts
const result = await consensus.verify(eventId);
```

Verification requires the event to be indexed and checks agreement with the configured Mirror Node.

## Command behavior

| Command                          | Mainnet behavior                                                             |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `npm run setup`                  | Testnet-only. Do not use with mainnet credentials.                           |
| `npm run consensus:topic:create` | Creates a topic on the configured network.                                   |
| `npm run example:publish`        | Publishes a paid event on the configured network.                            |
| `npm run consensus:indexer`      | Reads the configured Mirror Node and writes to the configured database.      |
| `npm run dev`                    | Displays indexed data and network-specific explorer links.                   |
| `npm run consensus:rebuild`      | Resets configured projections and replays history. Stop other writers first. |
| `npm run consensus:proof`        | Requires testnet and rejects mainnet configuration.                          |
| `npm test`                       | Offline when `RUN_TESTNET_INTEGRATION` is unset.                             |

**Leave `RUN_TESTNET_INTEGRATION` unset in a mainnet environment.** The integration suite follows the central configuration and does not enforce a testnet network guard. Enabling it against mainnet would publish a paid event and reset/replay the configured projections.

## Deployment and recovery

Mainnet connectivity does not supply production application security. The included server remains a local development server.

Provide authenticated application endpoints, authorization, protected signing keys, database TLS, monitoring, backups, and worker supervision. Define application-level idempotency for business actions; each publish call generates a new event ID.

Before rebuilding, stop the indexer and other projection writers and confirm the database target. Rebuild clears registered domain projections and the topic's indexed state. Ensure the selected Mirror Node retains the history you need.

See [Operations and troubleshooting](operations.md) for replay semantics, error recovery, and deployment requirements.

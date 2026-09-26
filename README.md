# ConsensusKit

**Verifiable event infrastructure for Hedera applications.**

ConsensusKit is a Scaffold-HBAR template that connects Hedera Consensus Service (HCS) to PostgreSQL. Publish an event, process it in consensus order, build application state with a projector, and verify the indexed record against its HCS message.

You own the event types, business logic, projections, and application UI. ConsensusKit supplies the publishing, indexing, verification, and replay infrastructure.

## Features

- Versioned events with deterministic SHA-256 payload hashes.
- HCS topic creation and publishing through the Hedera SDK.
- Mirror Node ingestion with sequence checks, deduplication, and transactional checkpoints.
- Developer-defined PostgreSQL projectors.
- Event verification and complete projection rebuilds.
- Local event explorer with Hashscan links.
- Interactive terminal setup with masked credentials.
- One replaceable tasks example.

## Requirements

- Node.js **20.18.3 or newer** and npm.
- A funded Hedera **testnet** account and its private key.
- A PostgreSQL database, including local PostgreSQL or Supabase.
- Network access to Hedera, Mirror Node, and your database.

The quick start uses testnet. For a mainnet application, follow [Mainnet setup](docs/mainnet.md).

## Quick start

### 1. Create your project

```bash
npm create scaffold-hbar@latest my-consensus-app -- --template anoop04singh/consensus-kit#master --network testnet
cd my-consensus-app
```

The scaffolder installs dependencies. ConsensusKit includes its own Vite explorer and requires no Solidity framework.

Prefer a direct download? [Download the source ZIP](https://github.com/anoop04singh/consensus-kit/archive/refs/heads/master.zip), extract it, open the extracted directory in your terminal, and run `npm ci`. You can also clone:

```bash
git clone https://github.com/anoop04singh/consensus-kit.git
cd consensus-kit
npm ci
```

### 2. Configure the project

```bash
npm run setup
```

The wizard asks for:

1. Hedera testnet account ID.
2. Private key format and private key.
3. PostgreSQL provider and connection URL.
4. Supabase TLS options.
5. A new or existing HCS topic.
6. Optional connection validation and database initialization.

Choose **Create a new testnet topic** and keep both database steps selected for a complete first setup. Secret inputs are masked. Configuration is stored in the Git-ignored `.env` file.

See [Configuration](docs/configuration.md) for manual setup, key formats, and Supabase connections.

### 3. Run the demo

In one terminal:

```bash
npm run consensus:indexer
```

In a second terminal:

```bash
npm run dev
```

In a third terminal:

```bash
npm run example:publish
```

Open [localhost:3000](http://127.0.0.1:3000). Allow time for Mirror Node ingestion, refresh the explorer, select an event, and choose **Verify with Mirror Node**.

The explorer displays the topic, indexed count, checkpoint, event details, and verification results. “At checkpoint” indicates indexed progress; it does not measure worker health or compare against the current topic head.

## How it works

```text
Your application
    │ publish()
    ▼
Hedera Consensus Service
    │ ordered messages + consensus timestamps
    ▼
Mirror Node → indexer → your projector → PostgreSQL
                                          │
                                     queries + explorer
```

HCS supplies the ordered, replayable event history. PostgreSQL stores indexed metadata and application projections. Each event's metadata, projector writes, and checkpoint update share one database transaction.

| Operation                      | Purpose                                                |
| ------------------------------ | ------------------------------------------------------ |
| `consensus.publish(input)`     | Submit an event to HCS.                                |
| `registerProjector(projector)` | Define how a stream updates application tables.        |
| `consensus.verify(eventId)`    | Compare an indexed event with its Mirror Node message. |
| `npm run consensus:rebuild`    | Recreate projections from HCS history.                 |

## Build your application

Import the SDK from the template source:

```ts
import { consensus } from './packages/consensus/index.js';

const receipt = await consensus.publish({
  stream: 'tasks',
  entityId: 'task_123',
  type: 'TASK_CREATED',
  payload: { title: 'Review the event pipeline' },
});

console.log(receipt.eventId);
```

Place domain tables and projector logic in your application package. Register projector imports in `consensus.projectors.ts` and migration paths in `scripts/migrations.ts`.

Follow [Build an application](docs/build-an-application.md) for a complete example and [API reference](docs/api-reference.md) for the contract.

## Commands

| Command                          | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `npm run setup`                  | Configure credentials, database, and topic. |
| `npm run dev`                    | Start the local explorer and read-only API. |
| `npm run build`                  | Type-check and build frontend assets.       |
| `npm run lint`                   | Run ESLint.                                 |
| `npm test`                       | Run offline tests.                          |
| `npm run format`                 | Format source and documentation.            |
| `npm run db:migrate`             | Run registered database initialization SQL. |
| `npm run consensus:topic:create` | Create a topic and print its ID.            |
| `npm run consensus:indexer`      | Poll Mirror Node and process events.        |
| `npm run consensus:rebuild`      | Reset projections and replay history.       |
| `npm run consensus:proof`        | Publish, verify, and save public evidence.  |
| `npm run example:publish`        | Publish one task event.                     |

## Documentation

- [Mainnet setup](docs/mainnet.md) — network configuration, credentials, topics, and deployment.
- [Configuration](docs/configuration.md) — wizard, environment, PostgreSQL, and Supabase.
- [Build an application](docs/build-an-application.md) — events, migrations, and projectors.
- [API reference](docs/api-reference.md) — SDK, event format, and HTTP endpoints.
- [Operations and troubleshooting](docs/operations.md) — tests, replay, recovery, and deployment.
- [Architecture and template specification](docs/architecture.md) — packages and guarantees.

## Testnet evidence

[testnet-evidence.json](testnet-evidence.json) contains public identifiers for a verified message on topic `0.0.10716275`, sequence `3`.

- [Mirror Node message](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10716275/messages/3)
- [Hashscan topic](https://hashscan.io/testnet/topic/0.0.10716275)

Run `npm run consensus:proof` to generate evidence for your topic. Testnet history can be reset by the network.

## Scope

One configured topic and compact JSON events up to **1024 bytes including the envelope**. No authentication, smart contracts, webhooks, or multi-topic orchestration. HCS messages are public; publish only data suitable for public disclosure.

Verification checks agreement with the configured Mirror Node. It is not an independent cryptographic proof of that service. The included server is for local development; the build command produces frontend assets in `dist/frontend`.

## License

[MIT](LICENSE).

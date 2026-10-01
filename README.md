# ConsensusKit

**A Scaffold-HBAR template for verifiable, event-driven applications.**

## Demo Video

Watch the ConsensusKit demo:

[![Watch the demo](https://img.youtube.com/vi/ni-yt4F859c/maxresdefault.jpg)](https://youtu.be/ni-yt4F859c)

[Watch on YouTube](https://youtu.be/ni-yt4F859c)

ConsensusKit connects a Hedera Consensus Service (HCS) topic to PostgreSQL. Your application publishes a compact event to HCS. A worker reads the event through Mirror Node in consensus order, stores its metadata, and runs the projector you registered for that event. The included explorer shows indexed events and can compare an indexed record with its HCS message.

You define the event types, domain tables, projection logic, and application UI. The template supplies publishing, ordered indexing, checkpointing, replay, and verification. The tasks stream under `packages/example` is a small optional demonstration.

## What you get

| Primitive                      | What it does                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `consensus.publish(input)`     | Validates an event, hashes its payload, and submits it to the configured HCS topic.      |
| `registerProjector(projector)` | Connects event types in one stream to your PostgreSQL projection code.                   |
| `consensus.verify(eventId)`    | Compares indexed metadata and the payload hash with the message returned by Mirror Node. |
| `npm run consensus:rebuild`    | Clears registered projections and replays the topic's available history.                 |

HCS provides ordered, replayable history and a consensus timestamp. PostgreSQL provides fast queries over current application state. The indexer commits event metadata, projector writes, and the checkpoint in one database transaction.

```text
Application → publish() → HCS topic
                         ↓
                     Mirror Node
                         ↓
             indexer → projector → PostgreSQL
                                      ↓
                              explorer / queries
```

## Requirements

- Node.js **20.18.3 or newer** and npm.
- A funded Hedera testnet account with its account ID and private key. [Create one in Hedera Portal](https://docs.hedera.com/networks/testnet/access).
- A PostgreSQL database and connection URI. Local PostgreSQL and [Supabase Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) are supported.
- Network access to Hedera, the configured Mirror Node, and PostgreSQL.

This quick start uses **testnet**. For a mainnet project, use [Mainnet setup](docs/mainnet.md); the interactive wizard configures testnet only.

## Quick start

### 1. Create a project

```bash
npm create scaffold-hbar@latest my-consensus-app -- --template anoop04singh/consensus-kit#master --network testnet
cd my-consensus-app
```

The scaffolder downloads the template, installs its npm dependencies, and creates a Git repository for your project. It may offer optional Hedera agent skills; they are not required to use ConsensusKit. The generated project contains editable source code and a local explorer. It does not require Solidity. See [Installation](docs/installation.md) for cloning or downloading the source instead.

### 2. Configure Hedera and PostgreSQL

```bash
npm run setup
```

The terminal wizard asks for your account ID, private key format and key, PostgreSQL connection URI, and HCS topic. Choose **Create a new testnet topic** if you do not have one. Leave both database steps selected to check the connection and create the tables. The wizard stores the values in the Git-ignored `.env` file and saves a newly created topic ID there.

Use the key format that matches your Hedera account. For Supabase, paste a **PostgreSQL connection URI** from its Connect panel, not the project URL or API key. [Configuration](docs/configuration.md) explains Supabase connection modes, TLS, and manual `.env` setup.

### 3. Run the example pipeline

Open three terminals in your project directory:

```bash
# Terminal 1: read the HCS topic and update PostgreSQL
npm run consensus:indexer
```

```bash
# Terminal 2: serve the local event explorer
npm run dev
```

```bash
# Terminal 3: publish one task event
npm run example:publish
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Once Mirror Node exposes the message and the indexer processes it, select the event and choose **Verify with Mirror Node**. The explorer also links to the topic on Hashscan.

Publishing succeeds before Mirror Node and PostgreSQL necessarily show the event. If the event is not visible yet, wait briefly and use **Refresh**. The explorer's “At checkpoint” label reports stored index progress; it is not a worker-health signal or a comparison with the live topic head.

## Build your application

The example is replaceable. To add your own stream:

1. Define event names and payload validation in application code.
2. Create SQL for the domain tables your application will query.
3. Register a stream projector with handlers and a `reset` callback.
4. Import its registration in `consensus.projectors.ts` and add its SQL file to `scripts/migrations.ts`.
5. Run `npm run db:migrate`, start the indexer, and publish events from your backend.

For a complete file-by-file example, see [Build an application](docs/build-an-application.md). To remove the tasks registration and start with only framework tables, see [Customize your project](docs/customization.md).

From a TypeScript file at the project root, publishing looks like this:

```ts
import { consensus } from './packages/consensus/index.js';

const receipt = await consensus.publish({
  stream: 'tasks',
  entityId: 'task_123',
  type: 'TASK_CREATED',
  payload: { title: 'Review the event pipeline' },
});

console.log(receipt.eventId, receipt.sequenceNumber);
```

The SDK writes to HCS. The indexer writes to PostgreSQL after Mirror Node exposes the message. Query your domain tables from your backend; do not use HCS as an application query database.

## Commands

| Command                                       | Purpose                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run setup`                               | Interactively configure a testnet account, database, and topic.                 |
| `npm run db:migrate`                          | Execute the registered framework and domain SQL files.                          |
| `npm run consensus:topic:create`              | Create a topic on the network in `consensus.config.ts` and print its ID.        |
| `npm run consensus:indexer`                   | Poll Mirror Node and process topic messages in sequence order.                  |
| `npm run consensus:rebuild`                   | Reset registered projections and replay available HCS history.                  |
| `npm run dev`                                 | Start the explorer and local read-only API at `127.0.0.1:3000` by default.      |
| `npm run example:publish`                     | Publish one event from the optional tasks example.                              |
| `npm run consensus:proof`                     | Publish, index, verify, and save public testnet evidence for the tasks example. |
| `npm run lint` / `npm test` / `npm run build` | Lint, run offline tests, and type-check/build the frontend.                     |
| `npm run format`                              | Format source and documentation.                                                |

Stop the indexer before running `consensus:rebuild`. The proof command requires the tasks example; adapt it if you replace that stream.

## Documentation

- [Installation](docs/installation.md): scaffold, clone, or download the template.
- [Configuration](docs/configuration.md): wizard, environment variables, PostgreSQL, and Supabase.
- [Customize your project](docs/customization.md): register your domain or start without the tasks example.
- [Build an application](docs/build-an-application.md): events, migrations, projectors, publishing, and replay.
- [API reference](docs/api-reference.md): SDK contracts, event envelope, and local HTTP endpoints.
- [Operations and troubleshooting](docs/operations.md): indexer, rebuild, tests, recovery, and deployment.
- [Mainnet setup](docs/mainnet.md): credentials, network configuration, and mainnet command behavior.
- [Architecture](docs/architecture.md): package responsibilities, data flow, and guarantees.

## Testnet evidence

[Template testnet evidence](docs/evidence/README.md) records a verified HCS message on topic `0.0.10716275`, sequence `3`, with [Mirror Node](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10716275/messages/3) and [Hashscan](https://hashscan.io/testnet/topic/0.0.10716275) links. Run `npm run consensus:proof` to generate evidence for your own configured testnet topic. Testnet history can be reset by the network.

## Scope and security

ConsensusKit uses **one configured HCS topic**. Each complete JSON envelope, including the payload, must fit within **1024 UTF-8 bytes**. Publish a compact reference and digest when application data is larger. HCS messages are public, so never publish secrets or private personal data.

The included HTTP server is a **localhost development tool**, not a production API deployment. Verification checks agreement with the configured Mirror Node; it does not independently prove that service's response or validate your business logic. The template does not include authentication, webhooks, smart contracts, Kafka/Redis, GraphQL, or multi-topic orchestration.

## License

[MIT](LICENSE).

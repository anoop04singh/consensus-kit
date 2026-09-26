# ConsensusKit project

A customizable Hedera event project built with [ConsensusKit](https://github.com/anoop04singh/consensus-kit).

Define your events and PostgreSQL projectors. The included infrastructure handles HCS publishing, ordered ingestion, deduplication, checkpoints, verification, and replay.

## Start here

Already created this project with Scaffold-HBAR? Open its directory and run:

```bash
npm run setup
```

The testnet wizard asks for your account ID, masked private key, database URL, and topic. It can check the connection, create a topic, and run your registered migrations. Settings are saved in the ignored `.env` file.

For a source ZIP or clone, run `npm ci` first. To create a new project, see [Installation](docs/installation.md). Node.js **20.18.3 or newer** is required.

Use [manual mainnet setup](docs/mainnet.md) for mainnet. The interactive wizard targets testnet.

## Make it yours

Start with these files:

| File                            | What you customize                                                         |
| ------------------------------- | -------------------------------------------------------------------------- |
| `packages/example/events.ts`    | The bundled task event; use it as a reference for your own event types.    |
| `packages/example/projector.ts` | A small example of payload validation, projection SQL, and reset behavior. |
| `consensus.projectors.ts`       | Import the projectors your application runs.                               |
| `scripts/migrations.ts`         | Register the SQL files that create your application's tables.              |
| `consensus.config.ts`           | Topic, network, Mirror Node, database, and polling interval.               |
| `packages/frontend`             | The generic development explorer; extend it or build your own UI.          |

The tasks stream is a working example. It is registered in the two composition files above so you can try the pipeline immediately. Follow [Customize your project](docs/customization.md) to replace it or start with only the infrastructure.

The generic core lives in `packages/consensus`, `packages/indexer`, and `packages/database`. Keep domain behavior in your application code.

## Run the infrastructure

Start the indexer in one terminal:

```bash
npm run consensus:indexer
```

Start the local explorer in another:

```bash
npm run dev
```

Open [localhost:3000](http://127.0.0.1:3000). The explorer displays indexed events from your configured topic. Its checkpoint describes database progress, not live worker health.

### Optional: try the tasks example

With the bundled projector and migration enabled:

```bash
npm run example:publish
```

Wait for Mirror Node ingestion, refresh the explorer, select the event, and choose **Verify with Mirror Node**. This publishes a real event on the configured network.

## Developer API

```ts
import { consensus } from './packages/consensus/index.js';

const receipt = await consensus.publish({
  stream: 'tasks',
  entityId: 'task_123',
  type: 'TASK_CREATED',
  payload: { title: 'My first event' },
});

// Call once the indexer has stored the event.
const result = await consensus.verify(receipt.eventId);
```

Register stream handlers with `registerProjector()` and rebuild projections with `npm run consensus:rebuild`. See [Build an application](docs/build-an-application.md) and the [API reference](docs/api-reference.md).

```text
Your event → HCS → Mirror Node → indexer → your projector → PostgreSQL
```

Each event's metadata, projection writes, and checkpoint share one database transaction. HCS retains the small event payload for replay; PostgreSQL serves application queries.

## Commands

| Command                          | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `npm run setup`                  | Configure testnet credentials, topic, and database.           |
| `npm run dev`                    | Start the local event explorer.                               |
| `npm run build`                  | Type-check and build frontend assets.                         |
| `npm run lint`                   | Run ESLint.                                                   |
| `npm test`                       | Run offline framework tests.                                  |
| `npm run format`                 | Format source and documentation.                              |
| `npm run db:migrate`             | Run your registered database initialization SQL.              |
| `npm run consensus:topic:create` | Create a topic on the configured network.                     |
| `npm run consensus:indexer`      | Index topic messages and run registered projectors.           |
| `npm run consensus:rebuild`      | Reset registered projections and replay history.              |
| `npm run example:publish`        | Publish the optional tasks example.                           |
| `npm run consensus:proof`        | Generate your own testnet evidence using the bundled example. |

Stop the indexer before rebuilding. Live integration tests use the tasks example and reset its projections; use a dedicated testnet database.

## Documentation

- [Installation](docs/installation.md)
- [Customize your project](docs/customization.md)
- [Configuration and database setup](docs/configuration.md)
- [Build an application](docs/build-an-application.md)
- [API reference](docs/api-reference.md)
- [Operations and troubleshooting](docs/operations.md)
- [Mainnet setup](docs/mainnet.md)
- [Architecture](docs/architecture.md)
- [Template testnet evidence](docs/evidence/README.md)

## Scope and license

One configured topic, a generic explorer, and one replaceable example. No authentication, Solidity deployment, webhooks, Kafka/Redis, or GraphQL.

Complete HCS envelopes must fit within **1024 UTF-8 bytes**. Messages are public. Verification checks the configured Mirror Node; it is not an independent cryptographic proof of that service. The explorer is a development server.

[MIT license](LICENSE).

# ConsensusKit

ConsensusKit is a Scaffold-HBAR template for verifiable, event driven applications. It publishes compact JSON events to one Hedera Consensus Service (HCS) topic, reads their final consensus order from Mirror Node, applies developer projectors, and stores queryable metadata and projections in PostgreSQL.

HCS is the replayable source of truth. PostgreSQL serves application queries. A failed projector rolls back its event metadata and checkpoint in one database transaction, so the event can be retried without partial state.

```text
application → consensus.publish() → HCS topic
                                  ↓
                           Mirror Node REST
                                  ↓
                       ordered indexer + projector
                                  ↓
                    Postgres metadata + domain tables
                                  ↓
                        explorer / verify()
```

## Scaffold and requirements

Node.js 20.18.3 or newer and PostgreSQL are required. To scaffold from a published repository:

```bash
npm create scaffold-hbar@latest -- --template OWNER/consensus-kit
```

Replace `OWNER` with the published repository owner. This repository contains `template.json`, `packages/contracts`, and `packages/frontend` for Scaffold-HBAR compatibility. To use this checkout directly, run `npm install`.

## Configure and run

1. Copy `.env.example` to `.env`. Set `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, and `DATABASE_URL`. Use a funded Hedera testnet account. Never commit `.env`.
2. Create the database named in `DATABASE_URL`, then run `npm run db:migrate`.
3. Run `npm run consensus:topic:create`. Copy the printed `0.0.x` into `HEDERA_TOPIC_ID` in `.env`.
4. Start the indexer with `npm run consensus:indexer`.
5. In another terminal, run `npm run dev` and open `http://127.0.0.1:3000`.
6. Publish a tiny demonstration event with `npm run example:publish`, then refresh the explorer.

The indexer polls every three seconds. Mirror Node availability can lag consensus. The app binds to localhost and has no authentication; do not expose this development server publicly.

## Define events and projections

The application chooses stream names, entity IDs, event types, payload shape, and domain tables. The core has no task specific logic. The only bundled example is `packages/example`, which may be replaced.

```ts
import { consensus, registerProjector } from './packages/consensus/index.js';

registerProjector({
  stream: 'orders',
  handlers: {
    ORDER_CREATED: async (event, db) => {
      const payload = event.payload as { total: number };
      await db.query('INSERT INTO orders (id, total) VALUES ($1, $2)', [event.entityId, payload.total]);
    }
  },
  reset: async db => { await db.query('DELETE FROM orders'); }
});

await consensus.publish({
  stream: 'orders', entityId: 'order_123', type: 'ORDER_CREATED', payload: { total: 25 }
});
```

Create application tables in a migration and import the projector registration in `packages/indexer/worker.ts` (the example import shows where). `registerProjector` routes by stream and event type. A missing handler leaves the event indexed with no domain projection. The `reset` callback is required for rebuild. Handler SQL receives the same PostgreSQL transaction used for event metadata and checkpointing.

The HCS envelope contains version, UUID, stream, entity ID, type, payload, SHA-256 payload hash, optional metadata, and producer timestamp. Canonical JSON sorts object keys recursively before hashing. The publisher enforces a 1024 byte message limit, including the envelope. For larger application data, store it elsewhere and put a stable reference and digest in a small event payload. The original event payload remains on HCS so the example projection can be rebuilt from history.

## Verify and rebuild

```ts
const result = await consensus.verify(eventId);
// { verified: true, topicId, sequenceNumber, consensusTimestamp }
```

Verification loads indexed metadata, fetches the original HCS message at its topic and sequence from Mirror Node, validates the envelope, rehashes its payload, and compares the event identity and consensus metadata. It checks agreement with the configured Mirror Node; it is not a cryptographic proof independent of that service.

To rebuild, stop the indexer and run `npm run consensus:rebuild`. It clears registered projections, event metadata, and the checkpoint for the configured topic, then replays Mirror Node history in sequence order. A repeated event ID is skipped and its sequence checkpointed without rerunning the projector. An invalid payload hash, sequence gap, or projector error stops indexing without advancing the checkpoint. Restart after fixing the issue. Do not run the indexer and rebuild concurrently.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local explorer and read only API |
| `npm run build` | Type check and frontend build |
| `npm run lint` | Static lint |
| `npm test` | Offline framework tests |
| `npm run db:migrate` | Create framework and example tables |
| `npm run consensus:topic:create` | Create one HCS topic |
| `npm run consensus:indexer` | Poll and index Mirror Node messages |
| `npm run consensus:rebuild` | Clear projections and replay HCS |
| `npm run consensus:proof` | Publish, index, verify, and write public testnet evidence |
| `npm run example:publish` | Publish one example event |

Run the optional real testnet integration test after configuring a topic and PostgreSQL: `RUN_TESTNET_INTEGRATION=1 npm test`. On PowerShell use `$env:RUN_TESTNET_INTEGRATION='1'; npm test`. This sends a real paid testnet transaction. It needs a migrated database and may take up to two minutes. The default test suite remains offline.

## Testnet proof

No testnet credentials or topic were present when this repository was built, so this checkout does not yet claim an on chain demonstration. After configuring your testnet account and migrating the database, run `npm run consensus:proof`. It publishes one example event, waits for Mirror Node, indexes it, verifies it, and writes `testnet-evidence.json` with public identifiers and links for submission. The explorer also offers a Hashscan link for each indexed event. Never include the private key in evidence.

Hedera references: [create a topic and submit a message](https://docs.hedera.com/native/tutorials/consensus/create-first-topic), [query Mirror Node](https://docs.hedera.com/native/tutorials/consensus/query-mirror-node), [Mirror Node REST API](https://docs.hedera.com/reference/rest-api).

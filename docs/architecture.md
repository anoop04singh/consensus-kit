# Architecture and template specification

[Documentation home](../README.md)

ConsensusKit supplies reusable infrastructure for one HCS topic, ordered ingestion, and PostgreSQL projections.

## Packages

| Location                  | Responsibility                                                            |
| ------------------------- | ------------------------------------------------------------------------- |
| `packages/consensus`      | Config, event contract, hashing, client, publish, topic creation, verify. |
| `packages/indexer`        | Mirror Node, ordered ingestion, checkpoints, projectors, replay.          |
| `packages/database`       | PostgreSQL connection and two framework tables.                           |
| `packages/example`        | Replaceable tasks stream, projector, and migration.                       |
| `packages/frontend`       | Vite explorer and local HTTP API.                                         |
| `packages/contracts`      | Compatibility placeholder; Solidity is not required.                      |
| `consensus.projectors.ts` | Application projector imports.                                            |
| `scripts/migrations.ts`   | Application migration composition.                                        |
| `scripts/setup.ts`        | Interactive configuration and initialization.                             |

This is an npm workspace monorepo. The Scaffold-HBAR manifest declares frontend and Solidity selections as none: the template supplies its own explorer and uses HCS directly.

## Data flow

1. The application supplies stream, entity, type, and payload.
2. The publisher validates input and hashes canonical payload JSON.
3. The Hedera SDK submits the envelope.
4. Mirror Node exposes consensus timestamp and sequence.
5. The indexer validates the event and its sequence.
6. A database transaction stores metadata, runs the projector, and advances the checkpoint.
7. The application queries projections and verifies indexed records against Mirror Node.

The small original payload remains on HCS for replay. Application state lives in domain tables.

## Framework tables

### consensus_events

Stores event ID, stream, entity ID, type, payload hash, topic, sequence, consensus timestamp, metadata, and creation time.

Event ID is the primary key. Topic and sequence form a unique pair. Stream and entity have a query index. Full payloads are read from HCS rather than stored in this metadata table.

### consensus_checkpoints

Stores last sequence number and update time, keyed by topic ID.

Both tables enable row-level security. Included migrations configure backend access.

## Guarantees

| Guarantee         | Behavior                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Ordering          | Processes ascending sequence numbers and rejects gaps.                                       |
| Integrity         | Recomputes canonical payload hashes before projection.                                       |
| Deduplication     | Stored event IDs do not run their projector again.                                           |
| Atomic projection | Metadata, projection SQL, and checkpoint share a transaction.                                |
| Recovery          | Failure leaves the checkpoint at the last committed event.                                   |
| Replay            | Reset handlers clear derived state; history reconstructs it.                                 |
| Verification      | Checks indexed identity, hash, topic, sequence, and consensus timestamp against Mirror Node. |

Deduplication applies to event IDs, not business actions. Separate publish calls generate separate IDs. Run one worker and coordinate rebuilds with other writers.

## Capabilities

Includes topic creation, generic publishing, hashing, ingestion, checkpointing, projectors, verification, replay, interactive setup, and an infrastructure explorer.

Supports Node.js 20.18.3 or newer under the MIT license. Offline tests cover framework invariants; the optional integration test exercises the complete testnet/database pipeline. Public evidence is in [testnet-evidence.json](../testnet-evidence.json).

## Boundaries

- One configured topic per application instance.
- Maximum envelope size of 1024 UTF-8 bytes.
- One bundled example stream.
- No application authentication, webhooks, smart contracts, Kafka/Redis, or GraphQL.
- Verification relies on the configured Mirror Node.
- Rebuild requires retained history, compatible handlers, and externally referenced data where applicable.

See [Operations](operations.md) for recovery and deployment requirements.

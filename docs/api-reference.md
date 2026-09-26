# API reference

[Documentation home](../README.md)

ConsensusKit is distributed as template source. From a TypeScript file at the project root, import `consensus` from `./packages/consensus/index.js`. Adjust the relative path from other directories. The `.js` suffix is used in TypeScript source because the project uses NodeNext module resolution.

## `consensus.publish(input)`

Validates input, hashes the payload, creates an envelope, submits it to HCS, and waits for a receipt.

| Input      | Type        | Rules                                                                                                      |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `stream`   | string      | 1–128 characters; starts with a letter; remaining characters: letters, digits, underscore, dot, or hyphen. |
| `entityId` | string      | 1–256 characters.                                                                                          |
| `type`     | string      | Same rules as stream.                                                                                      |
| `payload`  | JSON value  | Required; null, booleans, strings, finite numbers, arrays, and objects.                                    |
| `metadata` | JSON object | Optional.                                                                                                  |

Unknown top-level fields are rejected. Undefined values, functions, and non-finite numbers are invalid payload data.

Result:

```ts
{
  eventId: string;
  transactionId: string;
  topicId: string;
  sequenceNumber: number;
}
```

Invalid input, missing configuration, oversized messages, and SDK/network failures reject the promise. Success does not imply Mirror Node or the database has caught up.

## Event envelope

```ts
type ConsensusEvent<T = unknown> = {
  version: 1;
  eventId: string;
  stream: string;
  entityId: string;
  type: string;
  payload: T;
  payloadHash: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};
```

The ID is a generated UUID. The timestamp is the producer's ISO timestamp; consensus time and sequence arrive separately through Mirror Node.

The payload hash is lowercase hexadecimal SHA-256 of canonical JSON. Object keys are sorted recursively; array order is preserved. The hash covers the payload only, not metadata or other envelope fields. `verify()` does not compare metadata. The payload itself remains in the HCS message so projectors can replay it.

The complete UTF-8 JSON message must fit within **1024 bytes**. For large data, publish a compact reference and digest and maintain durable access to the content.

## `registerProjector(projector)`

```ts
{
  stream: string;
  handlers: Record<
    string,
    (event: ConsensusEvent, db: DatabaseClient) => Promise<void>
  >;
  reset?: (db: DatabaseClient) => Promise<void>;
}
```

Empty or duplicate stream registrations throw. Import each projector registration from `consensus.projectors.ts` so the indexer and rebuild scripts load it. The database client is a PostgreSQL transaction client owned by the indexer; handlers must use this client for projection SQL.

Reset is optional at registration but required for every registered projector during rebuild. A reset callback should clear only that projector's derived tables. Missing stream/type handlers do not prevent metadata indexing. See [Build an application](build-an-application.md) for a complete registration example.

## `consensus.verify(eventId)`

Loads the indexed record and retrieves its HCS message through the configured Mirror Node.

Successful result:

```ts
{
  verified: true,
  topicId: '0.0.12345',
  sequenceNumber: 42,
  consensusTimestamp: '1700000000.000000001',
}
```

Checks event ID, stream, entity, type, stored and recomputed payload hash, configured topic, sequence, and consensus timestamp.

Call verification after the indexer stores the event. Missing records/messages, invalid envelopes, and mismatches return `verified: false` with a reason. Mismatch results include consensus location fields; missing-record/message results may not. Database and transport failures reject the promise.

Verification does not compare arbitrary domain tables, establish publisher identity, or provide a cryptographic proof independent of Mirror Node.

## Utilities

- `canonicalize(value)`: deterministic JSON text.
- `hashPayload(value)`: its SHA-256 digest.
- `defineConsensusConfig(config)`: validates the polling interval and returns configuration.

The entry point also exports `ConsensusEvent` and `PublishInput` types.

## Local HTTP API

The development server binds to `127.0.0.1` on `PORT` or 3000. Endpoints are read-only and have no authentication.

### `GET /api/overview`

```ts
{
  topicId: string;
  network: string;
  indexedEvents: number;
  lastSequence: number;
  events: Array<{
    event_id: string;
    stream: string;
    entity_id: string;
    event_type: string;
    payload_hash: string;
    topic_id: string;
    sequence_number: string;
    consensus_timestamp: string;
  }>;
}
```

Contains up to 50 events for the topic, newest first. Event bigint sequence values are serialized as strings; the summary checkpoint is a number.

### `GET /api/verify/:eventId`

Returns SDK verification for a UUID-shaped ID.

Unknown routes return HTTP 404. Database or verification execution errors return HTTP 500 with an error object. These endpoints are intended for local development.

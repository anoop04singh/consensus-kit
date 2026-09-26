# Build an application

[Documentation home](../README.md)

An application consists of event definitions, database tables, and projectors. The bundled tasks stream demonstrates each part under `packages/example`.

## 1. Define an event

Names and payloads belong to your application:

```ts
// packages/example/events.ts
export const TASK_STREAM = 'tasks';
export const TASK_CREATED = 'TASK_CREATED';
export type TaskCreated = { title: string };
```

Choose stable names and payload structures. Replay uses your current projector code, so handlers must understand historical events. Validate payloads at runtime; TypeScript alone does not validate messages.

## 2. Create a projection table

The example stores queryable task state:

```sql
CREATE TABLE IF NOT EXISTS example_tasks (
  task_id text PRIMARY KEY,
  title text NOT NULL
);
```

The bundled `packages/example/migration.sql` also configures backend-only access. Place your domain SQL alongside domain code and add its URL to `migrationFiles` in `scripts/migrations.ts`:

```ts
new URL('../packages/example/migration.sql', import.meta.url);
```

Run:

```bash
npm run db:migrate
```

The runner executes all registered SQL in one transaction on every invocation. It has no migration-version ledger. Keep initialization SQL repeatable and adopt a versioned migration strategy when your schema requires one. Enable RLS for tables in exposed Supabase schemas and grant access only to intended roles.

## 3. Register a projector

```ts
// packages/example/projector.ts
import { registerProjector } from '../indexer/projector.js';
import { TASK_CREATED, TASK_STREAM } from './events.js';

registerProjector({
  stream: TASK_STREAM,
  handlers: {
    [TASK_CREATED]: async (event, db) => {
      const payload = event.payload as { title?: unknown };
      if (typeof payload?.title !== 'string' || !payload.title) {
        throw new Error('TASK_CREATED requires title');
      }
      await db.query(
        'INSERT INTO example_tasks (task_id, title) VALUES ($1, $2) ' +
          'ON CONFLICT (task_id) DO UPDATE SET title = EXCLUDED.title',
        [event.entityId, payload.title],
      );
    },
  },
  reset: async (db) => {
    await db.query('DELETE FROM example_tasks');
  },
});
```

Import the registration from `consensus.projectors.ts`:

```ts
import './packages/example/projector.js';
```

The indexer and rebuild commands load this file. Register one projector per stream, including all supported event handlers.

### Handler rules

- Use the provided `db` client for projection writes.
- Do not commit, roll back, or release the client.
- Use parameterized SQL.
- Derive state from events rather than the current clock or random values.
- Keep irreversible external actions, such as sending email, out of projectors; rebuild runs handlers again.
- Provide `reset` to clear only the projector's derived state.

An error rolls back metadata, projection writes, and checkpoint together. Events without matching handlers are indexed without domain updates.

## 4. Publish

```ts
import { consensus } from './packages/consensus/index.js';

const result = await consensus.publish({
  stream: 'tasks',
  entityId: 'task_123',
  type: 'TASK_CREATED',
  payload: { title: 'Review the event pipeline' },
});
```

This import is relative to the project root; adjust paths for scripts inside packages.

Publishing returns an HCS receipt and does not write to PostgreSQL. Keep the indexer running. Mirror Node ingestion introduces a delay between consensus and database visibility.

Each publish call generates a new event ID. Repeating a business action through a second call produces another event. Apply application-level idempotency where required.

## 5. Query and verify

Query projections from your backend:

```sql
SELECT task_id, title FROM example_tasks ORDER BY task_id;
```

Once indexed:

```ts
const verification = await consensus.verify(result.eventId);
console.log(verification.verified);
```

The explorer exposes the same operation. Verification checks the event's relationship to HCS; it does not prove correctness of arbitrary application tables or business logic.

## 6. Rebuild

Stop the indexer and other projection writers, then run:

```bash
npm run consensus:rebuild
```

Rebuild clears registered projections and the configured topic's metadata/checkpoint, then replays available history. Restart the indexer when complete.

To use a new database, configure its URL, initialize tables, and rebuild from the same topic. Retain historical handlers and any external data referenced by payloads.

## Replace the example

Replace its migration and projector import with your application's equivalents. Keep domain behavior outside `packages/consensus` and `packages/indexer`. Test payload validation, projection behavior, and replay equivalence.

See [API reference](api-reference.md) and [Operations](operations.md).

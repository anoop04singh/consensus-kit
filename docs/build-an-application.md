# Build an application

[Documentation home](../README.md)

This guide adds an `orders` stream to a generated ConsensusKit project. It uses one event, `ORDER_CREATED`, to create a queryable row in PostgreSQL. The same steps apply to other streams and domain tables.

ConsensusKit handles HCS publishing, Mirror Node ingestion, sequence order, event metadata, checkpointing, verification, and replay. Your application owns the event contract and the SQL that turns events into current state.

## 1. Define the event contract

Create `packages/orders/package.json` so npm recognizes the directory as a workspace. Choose a package name that is unique in your project:

```json
{
  "name": "orders-projection",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
```

Run `npm install` once after adding the workspace so `package-lock.json` includes it. Commit the updated lockfile with your application code.

Create `packages/orders/events.ts`:

```ts
export const ORDER_STREAM = 'orders';
export const ORDER_CREATED = 'ORDER_CREATED';

export type OrderCreated = { totalCents: number };
```

Use stable stream and event names. `publish()` validates the generic envelope, but it does not know what `ORDER_CREATED` means. The projector below validates the payload at runtime before changing the database. Keep handlers compatible with historical events because rebuild reads the topic from the beginning.

## 2. Create the projection table

Create `packages/orders/migration.sql`:

```sql
CREATE TABLE IF NOT EXISTS orders (
  order_id text PRIMARY KEY,
  total_cents bigint NOT NULL
);

-- This table is written by the backend projector, not by browser roles.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON orders FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON orders FROM authenticated;
  END IF;
END $$;
```

The table is an application projection. The framework's `consensus_events` and `consensus_checkpoints` tables are created by `packages/database/migrations/001_initial.sql`.

In `scripts/migrations.ts`, keep the migration runner and set `migrationFiles` to:

```ts
export const migrationFiles = [
  new URL('../packages/database/migrations/001_initial.sql', import.meta.url),
  new URL('../packages/orders/migration.sql', import.meta.url),
];
```

This replaces the optional tasks migration in a new database. Run:

```bash
npm run db:migrate
```

The runner executes every registered SQL file in one transaction on each invocation. It does not track migration versions. Keep initialization SQL repeatable, and use an explicit migration plan for later schema changes. Removing a file from `migrationFiles` does not delete a table that already exists. For Supabase, keep RLS enabled on tables in exposed schemas and grant browser roles only the access your application requires. See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## 3. Register a projector

Create `packages/orders/projector.ts`:

```ts
import { registerProjector } from '../indexer/projector.js';
import { ORDER_CREATED, ORDER_STREAM } from './events.js';

registerProjector({
  stream: ORDER_STREAM,
  handlers: {
    [ORDER_CREATED]: async (event, db) => {
      const value = event.payload;
      if (
        typeof value !== 'object' ||
        value === null ||
        !('totalCents' in value) ||
        typeof value.totalCents !== 'number' ||
        !Number.isSafeInteger(value.totalCents) ||
        value.totalCents < 0
      ) {
        throw new Error('ORDER_CREATED requires nonnegative integer totalCents');
      }

      await db.query(
        `INSERT INTO orders (order_id, total_cents) VALUES ($1, $2)
         ON CONFLICT (order_id) DO UPDATE SET total_cents = EXCLUDED.total_cents`,
        [event.entityId, value.totalCents],
      );
    },
  },
  reset: async (db) => {
    await db.query('DELETE FROM orders');
  },
});
```

Replace the tasks import in `consensus.projectors.ts` with:

```ts
import './packages/orders/projector.js';
```

The indexer and rebuild scripts load `consensus.projectors.ts`. Register one projector per stream and add a handler for each event type you want to project. Events without a matching handler are still indexed as metadata.

The `db` argument is the transaction client owned by the indexer. Use it for every projection write; do not commit, roll back, or release it yourself. A handler error rolls back the event metadata, domain writes, and checkpoint together. The `reset` callback must clear this projector's derived state for rebuild. Keep email, payments, and other irreversible side effects outside projectors because replay runs handlers again.

## 4. Publish from backend code

Create `scripts/publish-order.ts`:

```ts
import { consensus } from '../packages/consensus/index.js';
import { ORDER_CREATED, ORDER_STREAM } from '../packages/orders/events.js';

const receipt = await consensus.publish({
  stream: ORDER_STREAM,
  entityId: 'order_123',
  type: ORDER_CREATED,
  payload: { totalCents: 2500 },
});

console.log(receipt);
```

Start the indexer in one terminal, then run the publisher in another:

```bash
npm run consensus:indexer
```

```bash
npx tsx scripts/publish-order.ts
```

The `.js` import suffix is used in TypeScript source because this project uses NodeNext module resolution. Keep Hedera keys and database credentials in backend environment variables, never in frontend code.

Publishing returns an HCS receipt with an event ID and sequence number. It does **not** write directly to PostgreSQL. Mirror Node ingestion can take time, and the indexer writes the row only after it reads and validates the message. Each publish call creates a new event ID; use application-level idempotency if retrying a business action must not create a second event.

## 5. Query and verify

Query the projection through your backend or a PostgreSQL client:

```sql
SELECT order_id, total_cents FROM orders ORDER BY order_id;
```

Open the explorer with `npm run dev`, select the indexed event, and choose **Verify with Mirror Node**. To verify from backend code, create `scripts/verify-order.ts`:

```ts
import { consensus } from '../packages/consensus/index.js';

const eventId = process.argv[2];
if (!eventId) throw new Error('Pass the event ID returned by publish');
console.log(await consensus.verify(eventId));
```

After the event appears in the explorer, pass the `eventId` printed by the publisher:

```bash
npx tsx scripts/verify-order.ts YOUR_EVENT_ID
```

Verification compares the stored metadata and payload hash with the HCS message returned by the configured Mirror Node. It does not verify the correctness of your `orders` table or business rules.

## 6. Rebuild from HCS

Stop the indexer and other writers to the projection tables, then run:

```bash
npm run consensus:rebuild
```

Rebuild clears every registered projector through its `reset` callback, removes indexed metadata and the checkpoint for the configured topic, and replays available HCS history. Restart the indexer when it finishes. To populate a replacement database, point `DATABASE_URL` at it, run `npm run db:migrate`, and rebuild from the same topic.

Replay requires the Mirror Node to retain the required history, handlers to understand historical events, and any data referenced outside HCS to remain available. Test that rebuilding produces the same domain state as ordinary indexing.

For exact SDK contracts, see [API reference](api-reference.md). For failure and recovery behavior, see [Operations](operations.md).

# Customize your project

[Project home](../README.md)

ConsensusKit provides the event infrastructure. You choose the application's event types, domain tables, projectors, and UI.

## Use the example as a starting point

The only bundled domain is a tasks stream under `packages/example`. Read its event and projector files, then add your domain code in your own package or directory.

1. Define event names and runtime payload validation.
2. Create SQL for the tables you want to query.
3. Register a projector with event handlers and a `reset` callback.
4. Import your projector from `consensus.projectors.ts`.
5. Add its SQL file to `scripts/migrations.ts`, then run `npm run db:migrate`.
6. Remove the example registration and migration when you no longer need them.
7. Test projection behavior and confirm replay produces the same state.

See [Build an application](build-an-application.md) for complete code examples.

## Start with only the infrastructure

Make these two edits **before running migrations** in a new database.

Replace the example import in `consensus.projectors.ts` with:

```ts
// Import your application's projector registrations here.
export {};
```

In `scripts/migrations.ts`, keep only the framework migration in `migrationFiles`:

```ts
export const migrationFiles = [
  new URL('../packages/database/migrations/001_initial.sql', import.meta.url),
];
```

Keep the migration runner below that array. Run `npm run setup` or `npm run db:migrate` to create only the two framework tables.

The example files can stay as reference material; they do not run without registration. The explorer and indexer work without a domain projector. Events are still validated and indexed, and no domain state is written until you register a handler.

Removing a migration entry does not remove tables or data that already exist. Use a fresh database for a clean start. Application schema changes require an explicit migration.

## Example-dependent commands

`npm run example:publish`, `npm run consensus:proof`, and the optional live integration test use the tasks stream. Keep the example registration and migration when running that demonstration, or adapt those scripts and the live test to your domain. The default offline framework tests do not need a running task projection.

The generic publish, index, verify, and rebuild APIs work with your registered domain.

## Project identity and UI

The generated root package name and explorer label use your selected project name. Internal workspace names identify the reusable ConsensusKit components.

Update the generated README title and introduction with your application's purpose. The included event explorer is a development tool; its content is based on indexed events rather than the tasks domain. Build your application's UI and API around its own projection tables.

## Keep the core reusable

Keep business behavior outside `packages/consensus` and `packages/indexer`. Use the PostgreSQL client supplied to each handler so event metadata, your projection, and the checkpoint share a transaction.

Reset handlers should clear only their derived tables. Avoid external side effects in projectors because rebuild executes handlers again. The template manages one topic and leaves domain behavior in application code.

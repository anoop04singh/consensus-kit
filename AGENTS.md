# ConsensusKit architecture rules

- HCS is the immutable, ordered event layer. PostgreSQL holds queryable metadata and application projections.
- Never use HCS as the application query database.
- Keep `packages/consensus` and `packages/indexer` free of application domain behavior.
- Define event types and domain tables in application code. Register stream handlers with `registerProjector` and provide a `reset` handler so rebuild can clear derived state.
- When adding an event type, define it in application code, add projector logic, and test it.
- Never bypass the publish → Mirror Node → index → project → verify pipeline.
- Do not commit `.env`, private keys, database credentials, or testnet secrets.

## Package responsibilities

- `packages/consensus`: config, envelope validation, canonical hashing, Hedera publish, verification.
- `packages/indexer`: Mirror Node reader, ordered ingestion, checkpoints, projector registry, rebuild.
- `packages/database`: PostgreSQL connection and migrations for framework metadata.
- `packages/example`: one replaceable tasks stream and projection.
- `packages/frontend`: infrastructure explorer and local API.
- `packages/contracts`: compatibility placeholder; no contract deployment required.

Run migrations before the indexer. Stop the indexer before rebuild. Keep HCS messages JSON serializable and below 1024 bytes.

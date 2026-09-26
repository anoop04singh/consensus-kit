# Operations and troubleshooting

[Documentation home](../README.md)

## Run the event pipeline

Run one indexer for the configured topic:

```bash
npm run consensus:indexer
```

The worker requests up to 100 messages in ascending sequence order and polls every three seconds by default. It checks payload hashes and sequence continuity before committing.

Mirror Node reads retry transport failures, HTTP 429, and server errors with up to three attempts. Persistent failures stop the worker. Resolve the cause and restart; ingestion resumes from the saved checkpoint.

## Rebuild projections

Stop the indexer and other projection writers:

```bash
npm run consensus:rebuild
```

Rebuild resets registered projections, event metadata, and the topic checkpoint, then processes available history from the beginning.

The reset is transactional; replayed events are committed individually. The whole rebuild is not one transaction. A failed replay leaves the successfully replayed prefix in the database. Resolve the error and resume with the indexer or run rebuild again.

Complete replay requires retained Mirror Node history and handlers for historical events. Missing reset handlers prevent the reset transaction from completing.

## Tests

### Offline checks

```bash
npm ci
npm run lint
npm test
npm run build
```

Tests cover hashing, schema validation, Mirror Node decoding/retries, deduplication, routing, rollback, sequence gaps, payload integrity, key parsing, and environment serialization.

### Live integration

Use a dedicated testnet topic and disposable database. The live test publishes a testnet event and resets/replays configured projections. Stop the indexer first.

Bash:

```bash
RUN_TESTNET_INTEGRATION=1 npm test
```

PowerShell:

```powershell
$env:RUN_TESTNET_INTEGRATION = '1'
npm test
Remove-Item Env:RUN_TESTNET_INTEGRATION
```

The test exercises publishing, Mirror Node retrieval, indexing, projection, verification, and equality of the complete task projection before and after replay. It requires initialized tables and funded testnet credentials.

### Public evidence

```bash
npm run consensus:proof
```

Publishes an example, waits for Mirror Node, indexes and verifies it, and writes public identifiers and links to `testnet-evidence.json`. Network resets can make historical testnet evidence unavailable.

## Troubleshooting

| Symptom                             | Action                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Setup needs an interactive terminal | Run setup directly in a terminal with keyboard input.                                                     |
| Invalid key or signature            | Check account, network, key format, and topic signing authority. Set the key type explicitly.             |
| Insufficient payer balance          | Fund the testnet account before topic creation or publishing.                                             |
| Database timeout                    | Check URI, availability, and network access. Use Supabase session pooling on IPv4-only networks.          |
| `SELF_SIGNED_CERT_IN_CHAIN`         | Configure the Supabase root certificate through setup.                                                    |
| Missing database relation           | Run migrations against the database used by the indexer.                                                  |
| Event absent from explorer          | Check topic, run the indexer, allow Mirror Node ingestion time, and refresh.                              |
| Event is not indexed                | Wait for indexing before verification.                                                                    |
| Sequence gap                        | Check continuous history at the configured endpoint. Do not advance the checkpoint past missing messages. |
| Payload hash or schema error        | Inspect the public message and its event contract. Invalid history blocks this strict indexer.            |
| Projector error                     | Correct validation or SQL, then restart from the checkpoint.                                              |
| Missing reset handler               | Add reset to every registered projector.                                                                  |
| Message exceeds 1024 bytes          | Reduce the envelope; publish a reference/digest for externally stored content.                            |

## Deployment

The Vite server is a localhost development tool. Build performs type checking and writes frontend assets; it does not create a production API deployment.

Provide authentication, authorization, secret management, TLS, process supervision, monitoring, and backups for a deployed application. Keep Hedera keys and database connections on the backend.

HCS messages are public and immutable within retained history. Do not publish secrets or private personal data. Submit keys control writing, not read access.

Projector SQL participates in a transaction and can reconstruct state when deterministic. External side effects need an application design that prevents replay from repeating them.

## Contributions

Follow [AGENTS.md](../AGENTS.md). Add tests for event behavior and framework guarantees. Run offline checks before submitting changes. Never commit private environment files.

CI runs install, lint, offline tests, and build on Node 20.18.3 and 22.

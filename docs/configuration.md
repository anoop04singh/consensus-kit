# Configuration

[Documentation home](../README.md)

Credentials are read from the project-root `.env`; application settings live in `consensus.config.ts`.

For mainnet, use the manual steps in [Mainnet setup](mainnet.md). The wizard is testnet-only.

## Interactive setup

```bash
npm run setup
```

Use arrow keys to choose an option, Space to select database steps, and Enter to continue. Private keys and database URLs are masked.

The wizard configures testnet. It can create a topic, check database connectivity, and initialize tables. Configuration is saved before selected network operations begin. A topic created by the wizard is saved automatically.

Rerun setup to update settings. Existing secrets can be retained without displaying them; unrelated environment entries are preserved. Ctrl+C cancels a prompt. Settings already saved remain available.

For an alternative output file:

```bash
npm run setup -- --output-env .env.demo
```

Application commands read `.env` by default; selecting another output does not switch their configuration source.

## Environment variables

| Variable             | Required for                                | Description                            |
| -------------------- | ------------------------------------------- | -------------------------------------- |
| `HEDERA_ACCOUNT_ID`  | Publishing, topic creation                  | Operator account, such as `0.0.12345`. |
| `HEDERA_PRIVATE_KEY` | Publishing, topic creation                  | Account private key.                   |
| `HEDERA_KEY_TYPE`    | Explicit raw-key selection                  | `ecdsa`, `ed25519`, or `der`.          |
| `HEDERA_TOPIC_ID`    | Publishing, indexing, verification, rebuild | HCS topic.                             |
| `DATABASE_URL`       | Database operations and explorer            | PostgreSQL connection URI.             |
| `PORT`               | Optional                                    | Explorer port; defaults to `3000`.     |

Keep secrets in `.env` or your runtime's secret store. Only `.env.example` belongs in version control. Never place credentials in frontend code.

### Private keys

Choose the format associated with your account: ECDSA raw hex, ED25519 raw hex, or DER. Set `HEDERA_KEY_TYPE` explicitly for raw keys. Without it, a `0x` prefix selects ECDSA, supported DER prefixes select DER, and other raw keys use ED25519 parsing. A valid key must also match the account.

## Manual setup

Copy `.env.example` to `.env` and fill in credentials and the database URI. Leave the topic empty if you need to create one.

```bash
npm run db:migrate
npm run consensus:topic:create
```

Save the printed topic ID as `HEDERA_TOPIC_ID`. The standalone topic command prints the ID; the wizard saves it for you.

New topics use the operator public key as their submit key. An existing topic must accept the configured operator's signature. Mirror Node reads remain public.

## PostgreSQL

Create a database before running setup. The connection role needs permission to create/manage tables during initialization and query/update them at runtime.

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/consensus_kit
```

Use a dedicated application database. The connection timeout is 15 seconds.

## Supabase

Supabase PostgreSQL is suitable for a demo. Use a PostgreSQL URI, not the project HTTP URL or API key.

Open **Connect** in the dashboard and copy the URI. Use a direct connection when reachable; on IPv4-only networks, use the **Session pooler** on port **5432**. Keep the supplied host and username, and percent-encode reserved password characters. See [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

### TLS

| Wizard option             | Behavior                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Supabase root certificate | `sslrootcert` with `sslmode=verify-full`. Recommended.                                     |
| System certificates       | `sslmode=verify-full` using runtime trust authorities.                                     |
| Encryption-only demo mode | `sslmode=require&uselibpqcompat=true`; encrypts traffic without verifying server identity. |

Download the root certificate from the database SSL settings and keep it at a stable local path. `SELF_SIGNED_CERT_IN_CHAIN` indicates an untrusted certificate chain. See [Supabase SSL documentation](https://supabase.com/docs/guides/platform/ssl-enforcement).

Bundled migrations enable row-level security and revoke `anon` and `authenticated` access to backend-owned tables when those roles exist. The application uses the configured backend database role; browser-facing Data API access is not required.

## Central configuration

`consensus.config.ts` supplies shared settings:

```ts
export default defineConsensusConfig({
  network: 'testnet',
  topicId: process.env.HEDERA_TOPIC_ID ?? '',
  mirrorNode: 'https://testnet.mirrornode.hedera.com',
  databaseUrl: process.env.DATABASE_URL ?? '',
  indexer: { intervalMs: 3000 },
});
```

Polling intervals must be integers of at least 100 milliseconds. Keep network, topic, operator account, and Mirror Node aligned. The included setup and evidence workflow target testnet.

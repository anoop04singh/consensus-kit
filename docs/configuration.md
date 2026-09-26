# Configuration

[Documentation home](../README.md)

Credentials and the database URI are read from the project-root `.env`; network, topic, Mirror Node, and polling settings live in `consensus.config.ts`. Existing process environment variables take precedence over `.env` values.

For mainnet, use the manual steps in [Mainnet setup](mainnet.md). The wizard is testnet-only.

## Interactive setup

```bash
npm run setup
```

Use arrow keys to choose an option, Space to select database steps, and Enter to continue. Private keys and database URLs are masked.

The wizard configures testnet. It can create a topic, check database connectivity, and initialize tables. Select the key format that matches your Hedera account. If you do not have a topic, choose **Create a new testnet topic**. Leave both database steps selected for a complete first setup.

The wizard writes `.env` before checking the database, running migrations, or creating a topic. If a connection or network operation fails, correct the setting and rerun setup. A topic created by the wizard is saved automatically.

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
| `HEDERA_KEY_TYPE`    | Explicit private-key parsing                | `ecdsa`, `ed25519`, or `der`.          |
| `HEDERA_TOPIC_ID`    | Publishing, indexing, verification, rebuild | HCS topic.                             |
| `DATABASE_URL`       | Database operations and explorer            | PostgreSQL connection URI.             |
| `PORT`               | Optional                                    | Explorer port; defaults to `3000`.     |

Keep secrets in `.env` or your runtime's secret store. Only `.env.example` belongs in version control. Never place credentials in frontend code. `PORT` controls the local explorer only.

### Private keys

Choose the format associated with your account: ECDSA raw hex, ED25519 raw hex, or DER. Set `HEDERA_KEY_TYPE` explicitly for raw keys. Without it, a `0x` prefix selects ECDSA, supported DER prefixes select DER, and other raw keys use ED25519 parsing. A valid key must also match the account.

## Manual setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env`. Fill in `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_KEY_TYPE`, and `DATABASE_URL`. Leave `HEDERA_TOPIC_ID` empty if you need to create a topic. Then run:

```bash
npm run db:migrate
npm run consensus:topic:create
```

Save the printed topic ID as `HEDERA_TOPIC_ID` in `.env`. If you already have a topic, set its ID and omit `npm run consensus:topic:create`. The standalone topic command prints the ID but does not edit `.env`; the wizard saves it for you.

New topics use the operator public key as their submit key. An existing topic must accept the configured operator's signature. Mirror Node reads remain public.

## PostgreSQL

Create a database before running setup. The connection role needs permission to create/manage tables during initialization and query/update them at runtime. The indexer and explorer use this connection from the backend; the browser never connects directly to PostgreSQL.

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/consensus_kit
```

Use a dedicated application database. The connection timeout is 15 seconds.

## Supabase

Supabase PostgreSQL is suitable for a demo. Use a PostgreSQL URI, not the project HTTP URL or API key.

Open **Connect** in the Supabase dashboard and copy the URI. Use the **Direct connection** when your machine can reach its IPv6 endpoint. On an IPv4-only network, choose the **Session pooler** on port **5432**. Keep the host and username supplied by Supabase, replace the password placeholder, and percent-encode reserved characters in the password. ConsensusKit uses persistent PostgreSQL clients, so the session pooler is the relevant IPv4 option. See [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

### TLS

| Wizard option             | Behavior                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Supabase root certificate | `sslrootcert` with `sslmode=verify-full`. Recommended.                                     |
| System certificates       | `sslmode=verify-full` using runtime trust authorities.                                     |
| Encryption-only demo mode | `sslmode=require&uselibpqcompat=true`; encrypts traffic without verifying server identity. |

Download the server root certificate from the database SSL settings and keep it at a stable local path. The wizard adds the resolved path to the database URI. `SELF_SIGNED_CERT_IN_CHAIN` indicates an untrusted certificate chain. See [Supabase SSL documentation](https://supabase.com/docs/guides/database/psql#connecting-with-ssl).

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

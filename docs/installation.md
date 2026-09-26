# Installation

[Project home](../README.md)

ConsensusKit is a **source template**. Each generated project owns a copy of the SDK, indexer, database code, explorer, and optional tasks example. You can edit them in the project you create.

## Create a project with Scaffold-HBAR

Use Node.js 20.18.3 or newer and npm. Choose a project directory name that is also a valid npm package name:

```bash
npm create scaffold-hbar@latest my-consensus-app -- --template anoop04singh/consensus-kit#master --network testnet
cd my-consensus-app
npm run setup
```

The `--` passes the template and network options to Scaffold-HBAR. The scaffolder downloads the template, installs dependencies, and initializes a Git repository. It may offer optional Hedera agent skills; you can skip them and still use the template. The selected project name becomes the root package name and explorer label. Internal `packages/*` names remain stable. The included README describes ConsensusKit; update its title and introduction when publishing your own application.

Setup runs in an interactive terminal. It asks for Hedera testnet credentials, a PostgreSQL URI, and a new or existing HCS topic. You can check the database connection and run the registered SQL files during setup. See [Configuration](configuration.md) for each choice.

## Clone or download the source

To work directly from the repository:

```bash
git clone https://github.com/anoop04singh/consensus-kit.git my-consensus-app
cd my-consensus-app
npm ci
npm run setup
```

You can also [download the source ZIP](https://github.com/anoop04singh/consensus-kit/archive/refs/heads/master.zip), extract it, open the extracted directory in a terminal, and run `npm ci` followed by `npm run setup`.

Cloning or extracting does not apply Scaffold-HBAR's name substitutions. Set the root `package.json` name for your application, update the README and explorer label as desired, and run `npm install --package-lock-only` to synchronize the lockfile after changing the package name.

## Next steps

Run the [example pipeline](../README.md#quick-start), then follow [Build an application](build-an-application.md) to define your own events and projectors. To start without the bundled task projection, follow [Customize your project](customization.md) **before** initializing a new database.

For mainnet, use [Mainnet setup](mainnet.md). The interactive wizard configures testnet only.

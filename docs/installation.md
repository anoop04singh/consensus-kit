# Installation

[Project home](../README.md)

ConsensusKit is a source template. A generated project contains editable infrastructure, one small example, and a local event explorer.

## Create a project

```bash
npx create-scaffold-hbar@latest my-consensus-app --template anoop04singh/consensus-kit#master --network testnet
cd my-consensus-app
npm run setup
```

Use a valid package name for the project directory. Scaffold-HBAR sets the root package name and README heading to the selected project name, installs dependencies, and initializes a new Git repository. ConsensusKit package names remain stable for the internal workspaces.

Setup is a separate interactive step. It asks for testnet credentials, database settings, and a topic. Choose whether to check the database and run the migrations you have registered.

## Clone or download

[Download ZIP](https://github.com/anoop04singh/consensus-kit/archive/refs/heads/master.zip), or clone:

```bash
git clone https://github.com/anoop04singh/consensus-kit.git my-consensus-app
cd my-consensus-app
npm ci
npm run setup
```

Cloning and ZIP extraction do not apply Scaffold-HBAR name substitutions. Edit the root package name for your project, then run `npm install --package-lock-only` to synchronize the lockfile.

## Next steps

Follow [Customize your project](customization.md) to register your own events, migrations, and projectors. The [project README](../README.md) lists the indexer and explorer commands.

For mainnet, use [Mainnet setup](mainnet.md) instead of the testnet wizard.

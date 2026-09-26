# Template testnet evidence

[Project home](../../README.md)

[template-testnet.json](template-testnet.json) records a public verification run of the ConsensusKit template. It is reference evidence for the template, not a receipt for your generated project or your configured account.

- Network: Hedera testnet.
- Topic: `0.0.10716275`.
- Sequence: `3`.
- [Mirror Node message](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10716275/messages/3).
- [Hashscan topic](https://hashscan.io/testnet/topic/0.0.10716275).

To produce evidence for your own project with the bundled example registered, run `npm run consensus:proof`. It writes a new `testnet-evidence.json` at your project root. That file is ignored by Git by default; review its public identifiers before choosing to share it.

The proof command uses testnet. Testnet history can be reset by the network.

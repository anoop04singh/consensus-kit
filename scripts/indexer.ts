import '../consensus.projectors.js';
import { runIndexer } from '../packages/indexer/worker.js';

runIndexer().catch(error => { console.error(error); process.exitCode = 1; });

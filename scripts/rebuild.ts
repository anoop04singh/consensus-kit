import '../consensus.projectors.js';
import { rebuild } from '../packages/indexer/rebuild.js';

rebuild().catch(error => { console.error(error); process.exitCode = 1; });

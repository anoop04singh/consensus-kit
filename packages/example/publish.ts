import 'dotenv/config';
import { consensus } from '../consensus/index.js';
import { TASK_CREATED, TASK_STREAM } from './events.js';

const result = await consensus.publish({ stream: TASK_STREAM, entityId: `task_${Date.now()}`, type: TASK_CREATED, payload: { title: 'Demo' } });
console.log(result);

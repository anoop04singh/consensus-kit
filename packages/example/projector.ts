import { registerProjector } from '../indexer/projector.js';
import { TASK_CREATED, TASK_STREAM, type TaskCreated } from './events.js';

// Example only — replace this event stream and projector with your application's domain.
registerProjector({
  stream: TASK_STREAM,
  handlers: {
    [TASK_CREATED]: async (event, db) => {
      const payload = event.payload as TaskCreated;
      if (typeof payload?.title !== 'string' || !payload.title) throw new Error('TASK_CREATED requires title');
      await db.query('INSERT INTO example_tasks (task_id, title) VALUES ($1, $2) ON CONFLICT (task_id) DO UPDATE SET title = EXCLUDED.title', [event.entityId, payload.title]);
    }
  },
  reset: async db => { await db.query('DELETE FROM example_tasks'); }
});

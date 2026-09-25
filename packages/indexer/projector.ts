import type { ConsensusEvent } from '../consensus/schema.js';
import type { DatabaseClient } from '../database/schema.js';

export type Projector = {
  stream: string;
  handlers: Record<string, (event: ConsensusEvent, db: DatabaseClient) => Promise<void>>;
  reset?: (db: DatabaseClient) => Promise<void>;
};

const projectors = new Map<string, Projector>();

export function registerProjector(projector: Projector): void {
  if (!projector.stream || projectors.has(projector.stream)) throw new Error(`Invalid or duplicate projector stream: ${projector.stream}`);
  projectors.set(projector.stream, projector);
}

export async function project(event: ConsensusEvent, db: DatabaseClient): Promise<void> {
  const handler = projectors.get(event.stream)?.handlers[event.type];
  if (handler) await handler(event, db);
}

export async function resetProjections(db: DatabaseClient): Promise<void> {
  for (const projector of projectors.values()) {
    if (!projector.reset) throw new Error(`Projector ${projector.stream} needs a reset handler for rebuild`);
    await projector.reset(db);
  }
}

export function clearProjectorsForTest() { projectors.clear(); }

import config from '../../consensus.config.js';
import { publish } from './publish.js';
import { verify } from './verify.js';
export { defineConsensusConfig } from './config.js';
export { registerProjector } from '../indexer/projector.js';
export { hashPayload, canonicalize } from './hash.js';
export type { ConsensusEvent, PublishInput } from './schema.js';
export const consensus = {
  publish: <T>(input: Parameters<typeof publish<T>>[1]) => publish(config, input),
  verify: (eventId: string) => verify(config, eventId)
};

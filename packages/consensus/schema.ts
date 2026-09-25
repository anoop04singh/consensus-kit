import { z } from 'zod';

const name = z.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_.-]*$/);
const jsonValue: z.ZodType<unknown> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.string(), z.number().finite(), z.array(jsonValue), z.record(jsonValue)
]));

export const publishInputSchema = z.object({
  stream: name,
  entityId: z.string().min(1).max(256),
  type: name,
  payload: jsonValue,
  metadata: z.record(jsonValue).optional()
}).strict();

export const eventSchema = publishInputSchema.omit({ payload: true }).extend({
  version: z.literal(1),
  eventId: z.string().uuid(),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  timestamp: z.string().datetime(),
  payload: jsonValue
}).strict();

export type PublishInput<T = unknown> = Omit<z.infer<typeof publishInputSchema>, 'payload'> & { payload: T };
export type ConsensusEvent<T = unknown> = Omit<z.infer<typeof eventSchema>, 'payload'> & { payload: T };

export function decodeEvent(message: string): ConsensusEvent {
  const event = eventSchema.parse(JSON.parse(message));
  return event as ConsensusEvent;
}

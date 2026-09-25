import { decodeEvent } from '../consensus/schema.js';

export type MirrorMessage = {
  sequenceNumber: number;
  consensusTimestamp: string;
  message: string;
};

type MirrorResponse = {
  messages: { sequence_number: number; consensus_timestamp: string; message: string }[];
};

function endpoint(base: string, topicId: string) {
  if (!/^0\.0\.[0-9]+$/.test(topicId)) throw new Error('Invalid topic ID');
  return `${base.replace(/\/$/, '')}/api/v1/topics/${topicId}/messages`;
}

async function request(url: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Mirror Node request failed: ${response.status} ${url}`);
  return response;
}

function parseMessage(row: MirrorResponse['messages'][number]): MirrorMessage {
  if (!Number.isSafeInteger(row.sequence_number) || row.sequence_number < 1 || !row.consensus_timestamp || typeof row.message !== 'string') {
    throw new Error('Invalid Mirror Node message');
  }
  return {
    sequenceNumber: row.sequence_number,
    consensusTimestamp: row.consensus_timestamp,
    message: Buffer.from(row.message, 'base64').toString('utf8')
  };
}

export async function listMessages(base: string, topicId: string, afterSequence: number): Promise<MirrorMessage[]> {
  const url = new URL(endpoint(base, topicId));
  url.searchParams.set('sequencenumber', `gt:${afterSequence}`);
  url.searchParams.set('order', 'asc');
  url.searchParams.set('limit', '100');
  const data = await (await request(url.toString())).json() as MirrorResponse;
  if (!Array.isArray(data.messages)) throw new Error('Invalid Mirror Node response');
  return data.messages.map(parseMessage);
}

export async function getMessage(base: string, topicId: string, sequence: number): Promise<MirrorMessage | null> {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('Invalid sequence number');
  const response = await fetch(`${endpoint(base, topicId)}/${sequence}`, { signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Mirror Node request failed: ${response.status}`);
  return parseMessage(await response.json() as MirrorResponse['messages'][number]);
}

export function decodeMirrorEvent(row: MirrorMessage) {
  return decodeEvent(row.message);
}

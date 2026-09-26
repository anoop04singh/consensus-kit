import { afterEach, expect, it, vi } from 'vitest';
import { getMessage } from '../packages/indexer/mirror-node.js';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('recovers a Mirror Node read after a temporary 502', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('', { status: 502 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      sequence_number: 1, consensus_timestamp: '1.000000001', message: 'e30='
    }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const pending = getMessage('https://example.com', '0.0.123', 1);
  await vi.runAllTimersAsync();
  expect(await pending).toEqual({ sequenceNumber: 1, consensusTimestamp: '1.000000001', message: '{}' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('bounds transient retries and preserves missing-message semantics', async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('', { status: 503 })));
  vi.stubGlobal('fetch', fetchMock);
  await expect(getMessage('https://example.com', '0.0.123', 1)).rejects.toThrow('503');
  expect(fetchMock).toHaveBeenCalledTimes(3);
  fetchMock.mockReset().mockResolvedValue(new Response('', { status: 404 }));
  expect(await getMessage('https://example.com', '0.0.123', 1)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

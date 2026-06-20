import { describe, it, expect } from 'vitest';
import { arrGet, arrQueueCount } from './arr-client.ts';
import type { HttpJson } from './http.ts';

function recorder(responses: Record<string, unknown>) {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const http: HttpJson = (async (url: string, opts?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: opts?.headers });
    return responses[url];
  }) as HttpJson;
  return { http, calls };
}

describe('arr-client', () => {
  it('arrGet issues the path with the X-Api-Key header', async () => {
    const { http, calls } = recorder({ 'http://arr/api/v3/series': [{}, {}] });
    const series = await arrGet<unknown[]>(http, 'http://arr', 'secret', '/api/v3/series');
    expect(series).toHaveLength(2);
    expect(calls[0].url).toBe('http://arr/api/v3/series');
    expect(calls[0].headers?.['X-Api-Key']).toBe('secret');
  });

  it('arrQueueCount reads totalRecords from the queue endpoint', async () => {
    const { http } = recorder({
      'http://arr/api/v3/queue?page=1&pageSize=1': { totalRecords: 5, records: [] },
    });
    expect(await arrQueueCount(http, 'http://arr', 'k')).toBe(5);
  });
});

import { describe, it, expect } from 'vitest';
import { httpJson, type FetchLike } from './http.ts';

const okFetch =
  (body: unknown, init: { ok?: boolean; status?: number } = {}): FetchLike =>
  (async () =>
    ({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    }) as unknown as Response) as unknown as FetchLike;

describe('httpJson', () => {
  it('returns parsed JSON on 2xx and forwards headers', async () => {
    let seenHeaders: Record<string, string> | undefined;
    const fetchFn = (async (_url: string, opts?: { headers?: Record<string, string> }) => {
      seenHeaders = opts?.headers;
      return { ok: true, status: 200, json: async () => ({ hello: 'world' }) } as unknown as Response;
    }) as unknown as FetchLike;
    const data = await httpJson<{ hello: string }>('http://svc/x', {
      headers: { 'X-Api-Key': 'k' },
      fetchFn,
    });
    expect(data.hello).toBe('world');
    expect(seenHeaders?.['X-Api-Key']).toBe('k');
  });

  it('throws with the status on a non-2xx response', async () => {
    await expect(
      httpJson('http://svc/x', { fetchFn: okFetch(null, { ok: false, status: 401 }) }),
    ).rejects.toThrow(/401/);
  });
});

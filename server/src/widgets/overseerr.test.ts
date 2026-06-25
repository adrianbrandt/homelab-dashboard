import { describe, it, expect } from 'vitest';
import { makeOverseerr } from './overseerr.ts';
import type { HttpJson } from './http.ts';

describe('overseerr module', () => {
  it('maps the request/count fields and sends X-Api-Key', async () => {
    let seenKey: string | undefined;
    const h: HttpJson = (async (url: string, opts?: { headers?: Record<string, string> }) => {
      seenKey = opts?.headers?.['X-Api-Key'];
      expect(url).toBe('http://ov/api/v1/request/count');
      return { total: 205, pending: 4, processing: 1, available: 200 };
    }) as HttpJson;

    const data = await makeOverseerr(h).fetch({ type: 'overseerr', url: 'http://ov', key: 'K' });
    expect(data).toEqual({ pending: 4, processing: 1, available: 200 });
    expect(seenKey).toBe('K');
  });
});

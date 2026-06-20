import { describe, it, expect } from 'vitest';
import { makeRadarr } from './radarr.ts';
import type { HttpJson } from './http.ts';

function http(byPath: (path: string) => unknown): HttpJson {
  return (async (url: string) => byPath(url.replace('http://rad', ''))) as HttpJson;
}

describe('radarr module', () => {
  it('maps queue/movies/missing', async () => {
    const h = http((path) => {
      if (path.startsWith('/api/v3/queue')) return { totalRecords: 1, records: [] };
      if (path.startsWith('/api/v3/movie')) return [{}, {}, {}];
      if (path.startsWith('/api/v3/wanted/missing')) return { totalRecords: 7, records: [] };
      throw new Error(`unexpected ${path}`);
    });
    const data = await makeRadarr(h).fetch({ type: 'radarr', url: 'http://rad', key: 'k' });
    expect(data).toEqual({ queue: 1, movies: 3, missing: 7 });
  });

  it('propagates an upstream error', async () => {
    const h: HttpJson = (async () => { throw new Error('HTTP 401 for http://rad/api/v3/queue'); }) as HttpJson;
    await expect(makeRadarr(h).fetch({ type: 'radarr', url: 'http://rad', key: 'bad' })).rejects.toThrow(/401/);
  });
});

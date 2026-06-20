import { describe, it, expect } from 'vitest';
import { makeSonarr } from './sonarr.ts';
import type { HttpJson } from './http.ts';

function http(byPath: (path: string) => unknown): { http: HttpJson; calls: string[] } {
  const calls: string[] = [];
  const fn: HttpJson = (async (url: string) => {
    calls.push(url);
    const path = url.replace('http://son', '');
    return byPath(path);
  }) as HttpJson;
  return { http: fn, calls };
}

describe('sonarr module', () => {
  it('maps queue/series/upcoming', async () => {
    const { http: h, calls } = http((path) => {
      if (path.startsWith('/api/v3/queue')) return { totalRecords: 3, records: [] };
      if (path.startsWith('/api/v3/series')) return [{}, {}, {}, {}];
      if (path.startsWith('/api/v3/calendar')) return [{}, {}];
      throw new Error(`unexpected ${path}`);
    });
    const mod = makeSonarr(h);
    const data = await mod.fetch({ type: 'sonarr', url: 'http://son', key: 'k' });
    expect(data).toEqual({ queue: 3, series: 4, upcoming: 2 });
    expect(calls.some((u) => u.includes('/api/v3/calendar?start='))).toBe(true);
  });

  it('rejects a config missing the key', () => {
    expect(makeSonarr().configSchema.safeParse({ type: 'sonarr', url: 'http://son' }).success).toBe(false);
  });
});

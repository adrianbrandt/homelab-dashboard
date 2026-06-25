import { describe, it, expect } from 'vitest';
import { makeProwlarr } from './prowlarr.ts';
import type { HttpJson } from './http.ts';

describe('prowlarr module', () => {
  it('sums grabs/queries and counts enabled indexers', async () => {
    const h: HttpJson = (async (url: string, opts?: { headers?: Record<string, string> }) => {
      expect(opts?.headers?.['X-Api-Key']).toBe('K');
      if (url.endsWith('/api/v1/indexerstats')) {
        return {
          indexers: [
            { numberOfGrabs: 3, numberOfQueries: 10 },
            { numberOfGrabs: 2, numberOfQueries: 5 },
          ],
        };
      }
      if (url.endsWith('/api/v1/indexer')) {
        return [{ enable: true }, { enable: false }, { enable: true }];
      }
      throw new Error('unexpected url ' + url);
    }) as HttpJson;

    const data = await makeProwlarr(h).fetch({ type: 'prowlarr', url: 'http://pr', key: 'K' });
    expect(data).toEqual({ indexers: 3, enabled: 2, grabs: 5, queries: 15 });
  });
});

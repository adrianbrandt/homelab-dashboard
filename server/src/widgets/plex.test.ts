import { describe, it, expect } from 'vitest';
import { makePlex } from './plex.ts';
import type { HttpJson } from './http.ts';

describe('plex module', () => {
  it('reads active streams + library count and sends token + json Accept', async () => {
    const seen: Record<string, Record<string, string> | undefined> = {};
    const h: HttpJson = (async (url: string, opts?: { headers?: Record<string, string> }) => {
      seen[url] = opts?.headers;
      if (url.endsWith('/status/sessions')) return { MediaContainer: { size: 2 } };
      if (url.endsWith('/library/sections')) return { MediaContainer: { Directory: [{}, {}, {}] } };
      throw new Error('unexpected url ' + url);
    }) as HttpJson;

    const data = await makePlex(h).fetch({ type: 'plex', url: 'http://px', token: 'T' });
    expect(data).toEqual({ streams: 2, libraries: 3 });
    expect(seen['http://px/status/sessions']).toMatchObject({
      Accept: 'application/json',
      'X-Plex-Token': 'T',
    });
  });

  it('defaults to zero when MediaContainer fields are absent', async () => {
    const h: HttpJson = (async () => ({ MediaContainer: {} })) as HttpJson;
    const data = await makePlex(h).fetch({ type: 'plex', url: 'http://px', token: 'T' });
    expect(data).toEqual({ streams: 0, libraries: 0 });
  });
});

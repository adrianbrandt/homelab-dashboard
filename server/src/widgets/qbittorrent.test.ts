import { describe, it, expect } from 'vitest';
import { makeQbittorrent } from './qbittorrent.ts';

function fakeRes(opts: { setCookie?: string | null; json?: unknown }): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'set-cookie' ? (opts.setCookie ?? null) : null),
    },
    json: async () => opts.json,
  } as unknown as Response;
}

describe('qbittorrent module', () => {
  it('logs in, buckets torrent states, and passes through speeds', async () => {
    const fetchFn = (async (url: string) => {
      const u = String(url);
      if (u.endsWith('/api/v2/auth/login')) return fakeRes({ setCookie: 'SID=tok; path=/' });
      if (u.endsWith('/api/v2/transfer/info'))
        return fakeRes({ json: { dl_info_speed: 1048576, up_info_speed: 524288 } });
      if (u.endsWith('/api/v2/torrents/info'))
        return fakeRes({
          json: [
            { state: 'downloading' },
            { state: 'stalledUP' },
            { state: 'uploading' },
            { state: 'pausedDL' },
            { state: 'error' },
          ],
        });
      throw new Error('unexpected url ' + u);
    }) as typeof fetch;

    const data = await makeQbittorrent(fetchFn).fetch({
      type: 'qbittorrent',
      url: 'http://q',
      username: 'u',
      password: 'p',
    });
    expect(data).toEqual({
      active: 3,
      downloading: 1,
      seeding: 2,
      downSpeed: 1048576,
      upSpeed: 524288,
    });
  });
});

import { describe, it, expect } from 'vitest';
import { makeQbitClient } from './qbit-client.ts';

function fakeRes(opts: {
  ok?: boolean;
  status?: number;
  setCookie?: string | null;
  json?: unknown;
}): Response {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'set-cookie' ? (opts.setCookie ?? null) : null),
    },
    json: async () => opts.json,
  } as unknown as Response;
}

describe('qbit-client', () => {
  it('login posts form creds and returns the session cookie pair (modern QBT_SID_<port> name)', async () => {
    let seenUrl: string | undefined;
    let seenInit: RequestInit | undefined;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      // qBittorrent 5.x issues a port-scoped cookie name and returns 204 on success.
      return fakeRes({
        status: 204,
        setCookie: 'QBT_SID_8080=/LaQ7gcEqFxZ0kMSB1; HttpOnly; SameSite=Lax; path=/',
      });
    }) as typeof fetch;

    const cookie = await makeQbitClient(fetchFn).login('http://q', 'u', 'p');
    expect(cookie).toBe('QBT_SID_8080=/LaQ7gcEqFxZ0kMSB1');
    expect(seenUrl).toBe('http://q/api/v2/auth/login');
    expect(seenInit?.method).toBe('POST');
    expect(String(seenInit?.body)).toContain('username=u');
    expect(String(seenInit?.body)).toContain('password=p');
  });

  it('login also handles a legacy SID cookie name', async () => {
    const fetchFn = (async () =>
      fakeRes({ setCookie: 'SID=abc123; HttpOnly; path=/' })) as typeof fetch;
    const cookie = await makeQbitClient(fetchFn).login('http://q', 'u', 'p');
    expect(cookie).toBe('SID=abc123');
  });

  it('login throws when no session cookie is returned', async () => {
    const fetchFn = (async () => fakeRes({ setCookie: null })) as typeof fetch;
    await expect(makeQbitClient(fetchFn).login('http://q', 'u', 'p')).rejects.toThrow(/cookie/i);
  });

  it('login throws on a non-ok response', async () => {
    const fetchFn = (async () => fakeRes({ ok: false, status: 403 })) as typeof fetch;
    await expect(makeQbitClient(fetchFn).login('http://q', 'u', 'p')).rejects.toThrow(/403/);
  });

  it('get sends the cookie pair verbatim and parses JSON', async () => {
    let seenCookie: string | undefined;
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      seenCookie = (init?.headers as Record<string, string>)?.Cookie;
      return fakeRes({ json: { x: 1 } });
    }) as typeof fetch;

    const r = await makeQbitClient(fetchFn).get<{ x: number }>(
      'http://q',
      '/api/v2/transfer/info',
      'QBT_SID_8080=abc',
    );
    expect(r).toEqual({ x: 1 });
    expect(seenCookie).toBe('QBT_SID_8080=abc');
  });

  it('get throws on a non-ok response', async () => {
    const fetchFn = (async () => fakeRes({ ok: false, status: 403 })) as typeof fetch;
    await expect(
      makeQbitClient(fetchFn).get('http://q', '/api/v2/torrents/info', 'QBT_SID_8080=abc'),
    ).rejects.toThrow(/403/);
  });
});

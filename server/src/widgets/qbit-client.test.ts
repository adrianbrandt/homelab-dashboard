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
  it('login posts form creds and returns the SID cookie', async () => {
    let seenUrl: string | undefined;
    let seenInit: RequestInit | undefined;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return fakeRes({ setCookie: 'SID=abc123; HttpOnly; path=/' });
    }) as typeof fetch;

    const sid = await makeQbitClient(fetchFn).login('http://q', 'u', 'p');
    expect(sid).toBe('abc123');
    expect(seenUrl).toBe('http://q/api/v2/auth/login');
    expect(seenInit?.method).toBe('POST');
    expect(String(seenInit?.body)).toContain('username=u');
    expect(String(seenInit?.body)).toContain('password=p');
  });

  it('login throws when no SID cookie is returned', async () => {
    const fetchFn = (async () => fakeRes({ setCookie: null })) as typeof fetch;
    await expect(makeQbitClient(fetchFn).login('http://q', 'u', 'p')).rejects.toThrow(/SID/);
  });

  it('login throws on a non-ok response', async () => {
    const fetchFn = (async () => fakeRes({ ok: false, status: 403 })) as typeof fetch;
    await expect(makeQbitClient(fetchFn).login('http://q', 'u', 'p')).rejects.toThrow(/403/);
  });

  it('get sends the SID cookie and parses JSON', async () => {
    let seenCookie: string | undefined;
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      seenCookie = (init?.headers as Record<string, string>)?.Cookie;
      return fakeRes({ json: { x: 1 } });
    }) as typeof fetch;

    const r = await makeQbitClient(fetchFn).get<{ x: number }>('http://q', '/api/v2/transfer/info', 'abc');
    expect(r).toEqual({ x: 1 });
    expect(seenCookie).toBe('SID=abc');
  });
});

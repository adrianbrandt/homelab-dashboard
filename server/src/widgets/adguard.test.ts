import { describe, it, expect } from 'vitest';
import { makeAdguard } from './adguard.ts';
import type { HttpJson } from './http.ts';

describe('adguard module', () => {
  it('maps stats and computes blocked %', async () => {
    let seenAuth: string | undefined;
    const h: HttpJson = (async (url: string, opts?: { headers?: Record<string, string> }) => {
      seenAuth = opts?.headers?.Authorization;
      expect(url).toBe('http://ag/control/stats');
      return { num_dns_queries: 200, num_blocked_filtering: 50 };
    }) as HttpJson;
    const data = await makeAdguard(h).fetch({
      type: 'adguard',
      url: 'http://ag',
      username: 'adrian',
      password: 'pw',
    });
    expect(data).toEqual({ queries: 200, blocked: 50, blockedPct: 25 });
    expect(seenAuth).toBe(`Basic ${Buffer.from('adrian:pw').toString('base64')}`);
  });

  it('returns 0% when there are no queries', async () => {
    const h: HttpJson = (async () => ({ num_dns_queries: 0, num_blocked_filtering: 0 })) as HttpJson;
    const data = await makeAdguard(h).fetch({ type: 'adguard', url: 'http://ag', username: 'a', password: 'b' });
    expect(data.blockedPct).toBe(0);
  });
});

import type { FetchLike } from './http.ts';

export interface QbitClient {
  login(url: string, username: string, password: string): Promise<string>;
  get<T>(url: string, path: string, sid: string): Promise<T>;
}

export function makeQbitClient(fetchFn: FetchLike = fetch): QbitClient {
  return {
    async login(url, username, password) {
      const body = new URLSearchParams({ username, password }).toString();
      const res = await fetchFn(`${url}/api/v2/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error(`qbittorrent login failed: HTTP ${res.status}`);
      const cookie = res.headers.get('set-cookie') ?? '';
      const m = /SID=([^;]+)/.exec(cookie);
      if (!m) throw new Error('qbittorrent login: no SID cookie returned');
      return m[1];
    },
    async get<T>(url: string, path: string, sid: string): Promise<T> {
      const res = await fetchFn(`${url}${path}`, { headers: { Cookie: `SID=${sid}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}${path}`);
      return (await res.json()) as T;
    },
  };
}

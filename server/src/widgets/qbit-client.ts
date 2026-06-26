import type { FetchLike } from './http.ts';

export interface QbitClient {
  /** Logs in and returns the session cookie as a verbatim `name=value` pair. */
  login(url: string, username: string, password: string): Promise<string>;
  /** Issues a GET with the given cookie pair sent verbatim as the Cookie header. */
  get<T>(url: string, path: string, cookie: string): Promise<T>;
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
      const setCookie = res.headers.get('set-cookie') ?? '';
      // qBittorrent's session cookie name varies by version (legacy `SID`,
      // 5.x `QBT_SID_<port>`, …). Capture the first cookie's `name=value` pair
      // and reuse it verbatim rather than assuming a fixed name.
      const m = /^\s*([^=;,\s]+=[^;]+)/.exec(setCookie);
      if (!m) throw new Error('qbittorrent login: no session cookie returned');
      return m[1];
    },
    async get<T>(url: string, path: string, cookie: string): Promise<T> {
      const res = await fetchFn(`${url}${path}`, { headers: { Cookie: cookie } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}${path}`);
      return (await res.json()) as T;
    },
  };
}

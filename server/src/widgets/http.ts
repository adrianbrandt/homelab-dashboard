export type FetchLike = typeof fetch;

export type HttpJson = <T = unknown>(
  url: string,
  opts?: { headers?: Record<string, string>; timeoutMs?: number },
) => Promise<T>;

export async function httpJson<T = unknown>(
  url: string,
  opts?: { headers?: Record<string, string>; timeoutMs?: number; fetchFn?: FetchLike },
): Promise<T> {
  const headers = opts?.headers;
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const fetchFn = opts?.fetchFn ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { headers, signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

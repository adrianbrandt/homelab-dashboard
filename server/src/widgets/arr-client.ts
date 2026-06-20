import type { HttpJson } from './http.ts';

export function arrGet<T>(http: HttpJson, baseUrl: string, key: string, path: string): Promise<T> {
  return http<T>(`${baseUrl}${path}`, { headers: { 'X-Api-Key': key } });
}

export async function arrQueueCount(http: HttpJson, baseUrl: string, key: string): Promise<number> {
  const q = await arrGet<{ totalRecords?: number }>(
    http,
    baseUrl,
    key,
    '/api/v3/queue?page=1&pageSize=1',
  );
  return q.totalRecords ?? 0;
}

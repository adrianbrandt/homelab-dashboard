import { z } from 'zod';
import type { RadarrData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';
import { arrGet, arrQueueCount } from './arr-client.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('radarr'),
  url: z.string(),
  key: z.string(),
});
type Config = z.infer<typeof schema>;

export function makeRadarr(http: HttpJson = httpJson): WidgetModule<Config, RadarrData> {
  return {
    type: 'radarr',
    configSchema: schema,
    async fetch(config) {
      const [queue, movies, missing] = await Promise.all([
        arrQueueCount(http, config.url, config.key),
        arrGet<unknown[]>(http, config.url, config.key, '/api/v3/movie'),
        arrGet<{ totalRecords?: number }>(
          http,
          config.url,
          config.key,
          '/api/v3/wanted/missing?page=1&pageSize=1',
        ),
      ]);
      return { queue, movies: movies.length, missing: missing.totalRecords ?? 0 };
    },
  };
}

export const radarr = makeRadarr();

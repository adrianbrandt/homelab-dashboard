import { z } from 'zod';
import type { SonarrData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';
import { arrGet, arrQueueCount } from './arr-client.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('sonarr'),
  url: z.string(),
  key: z.string(),
});
type Config = z.infer<typeof schema>;

export function makeSonarr(http: HttpJson = httpJson): WidgetModule<Config, SonarrData> {
  return {
    type: 'sonarr',
    configSchema: schema,
    async fetch(config) {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [queue, series, calendar] = await Promise.all([
        arrQueueCount(http, config.url, config.key),
        arrGet<unknown[]>(http, config.url, config.key, '/api/v3/series'),
        arrGet<unknown[]>(
          http,
          config.url,
          config.key,
          `/api/v3/calendar?start=${now.toISOString()}&end=${end.toISOString()}`,
        ),
      ]);
      return { queue, series: series.length, upcoming: calendar.length };
    },
  };
}

export const sonarr = makeSonarr();

import { z } from 'zod';
import type { OverseerrData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('overseerr'),
  url: z.string(),
  key: z.string(),
});
type Config = z.infer<typeof schema>;

interface RequestCount {
  pending?: number;
  processing?: number;
  available?: number;
}

export function makeOverseerr(http: HttpJson = httpJson): WidgetModule<Config, OverseerrData> {
  return {
    type: 'overseerr',
    configSchema: schema,
    async fetch(config) {
      const c = await http<RequestCount>(`${config.url}/api/v1/request/count`, {
        headers: { 'X-Api-Key': config.key },
      });
      return {
        pending: c.pending ?? 0,
        processing: c.processing ?? 0,
        available: c.available ?? 0,
      };
    },
  };
}

export const overseerr = makeOverseerr();

import { z } from 'zod';
import type { PlexData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('plex'),
  url: z.string(),
  token: z.string(),
});
type Config = z.infer<typeof schema>;

interface Sessions {
  MediaContainer?: { size?: number };
}
interface Sections {
  MediaContainer?: { Directory?: unknown[] };
}

export function makePlex(http: HttpJson = httpJson): WidgetModule<Config, PlexData> {
  return {
    type: 'plex',
    configSchema: schema,
    async fetch(config) {
      const headers = { Accept: 'application/json', 'X-Plex-Token': config.token };
      const [sessions, sections] = await Promise.all([
        http<Sessions>(`${config.url}/status/sessions`, { headers }),
        http<Sections>(`${config.url}/library/sections`, { headers }),
      ]);
      return {
        streams: sessions.MediaContainer?.size ?? 0,
        libraries: sections.MediaContainer?.Directory?.length ?? 0,
      };
    },
  };
}

export const plex = makePlex();

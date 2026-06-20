import { z } from 'zod';
import type { AdguardData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('adguard'),
  url: z.string(),
  username: z.string(),
  password: z.string(),
});
type Config = z.infer<typeof schema>;

interface Stats {
  num_dns_queries?: number;
  num_blocked_filtering?: number;
}

export function makeAdguard(http: HttpJson = httpJson): WidgetModule<Config, AdguardData> {
  return {
    type: 'adguard',
    configSchema: schema,
    async fetch(config) {
      const auth = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const stats = await http<Stats>(`${config.url}/control/stats`, {
        headers: { Authorization: auth },
      });
      const queries = stats.num_dns_queries ?? 0;
      const blocked = stats.num_blocked_filtering ?? 0;
      return { queries, blocked, blockedPct: queries ? Math.round((blocked / queries) * 100) : 0 };
    },
  };
}

export const adguard = makeAdguard();

import { z } from 'zod';
import type { ProwlarrData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';
import { arrGet } from './arr-client.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('prowlarr'),
  url: z.string(),
  key: z.string(),
});
type Config = z.infer<typeof schema>;

interface IndexerStat {
  numberOfGrabs?: number;
  numberOfQueries?: number;
}
interface IndexerStats {
  indexers?: IndexerStat[];
}
interface Indexer {
  enable?: boolean;
}

export function makeProwlarr(http: HttpJson = httpJson): WidgetModule<Config, ProwlarrData> {
  return {
    type: 'prowlarr',
    configSchema: schema,
    async fetch(config) {
      const [stats, indexers] = await Promise.all([
        arrGet<IndexerStats>(http, config.url, config.key, '/api/v1/indexerstats'),
        arrGet<Indexer[]>(http, config.url, config.key, '/api/v1/indexer'),
      ]);
      const list = stats.indexers ?? [];
      const grabs = list.reduce((s, i) => s + (i.numberOfGrabs ?? 0), 0);
      const queries = list.reduce((s, i) => s + (i.numberOfQueries ?? 0), 0);
      return {
        indexers: indexers.length,
        enabled: indexers.filter((i) => i.enable).length,
        grabs,
        queries,
      };
    },
  };
}

export const prowlarr = makeProwlarr();

import { z } from 'zod';
import type { QbittorrentData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import type { FetchLike } from './http.ts';
import { makeQbitClient } from './qbit-client.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('qbittorrent'),
  url: z.string(),
  username: z.string(),
  password: z.string(),
});
type Config = z.infer<typeof schema>;

const DOWNLOADING = new Set([
  'downloading',
  'stalledDL',
  'metaDL',
  'forcedDL',
  'checkingDL',
  'queuedDL',
  'allocating',
]);
const SEEDING = new Set(['uploading', 'stalledUP', 'forcedUP', 'checkingUP', 'queuedUP']);
const INACTIVE = new Set([
  'pausedDL',
  'pausedUP',
  'stoppedDL',
  'stoppedUP',
  'error',
  'missingFiles',
  'unknown',
]);

interface Transfer {
  dl_info_speed?: number;
  up_info_speed?: number;
}
interface Torrent {
  state: string;
}

export function makeQbittorrent(fetchFn: FetchLike = fetch): WidgetModule<Config, QbittorrentData> {
  const client = makeQbitClient(fetchFn);
  return {
    type: 'qbittorrent',
    configSchema: schema,
    async fetch(config) {
      const sid = await client.login(config.url, config.username, config.password);
      const [transfer, torrents] = await Promise.all([
        client.get<Transfer>(config.url, '/api/v2/transfer/info', sid),
        client.get<Torrent[]>(config.url, '/api/v2/torrents/info', sid),
      ]);
      return {
        active: torrents.filter((t) => !INACTIVE.has(t.state)).length,
        downloading: torrents.filter((t) => DOWNLOADING.has(t.state)).length,
        seeding: torrents.filter((t) => SEEDING.has(t.state)).length,
        downSpeed: transfer.dl_info_speed ?? 0,
        upSpeed: transfer.up_info_speed ?? 0,
      };
    },
  };
}

export const qbittorrent = makeQbittorrent();

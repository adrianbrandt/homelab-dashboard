import type { QbittorrentData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';
import { formatRate } from '../format.ts';

export function Qbittorrent({ data }: { data: QbittorrentData }) {
  return (
    <StatTile
      title="qBittorrent"
      metrics={[
        { label: 'active', value: data.active },
        { label: 'down', value: data.downloading },
        { label: 'seed', value: data.seeding },
        { label: '↓', value: formatRate(data.downSpeed) },
        { label: '↑', value: formatRate(data.upSpeed) },
      ]}
    />
  );
}

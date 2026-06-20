import type { SonarrData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Sonarr({ data }: { data: SonarrData }) {
  return (
    <StatTile
      title="Sonarr"
      metrics={[
        { label: 'queue', value: data.queue },
        { label: 'series', value: data.series },
        { label: 'upcoming', value: data.upcoming },
      ]}
    />
  );
}

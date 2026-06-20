import type { RadarrData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Radarr({ data }: { data: RadarrData }) {
  return (
    <StatTile
      title="Radarr"
      metrics={[
        { label: 'queue', value: data.queue },
        { label: 'movies', value: data.movies },
        { label: 'missing', value: data.missing },
      ]}
    />
  );
}

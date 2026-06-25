import type { PlexData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Plex({ data }: { data: PlexData }) {
  return (
    <StatTile
      title="Plex"
      metrics={[
        { label: 'streams', value: data.streams },
        { label: 'libraries', value: data.libraries },
      ]}
    />
  );
}

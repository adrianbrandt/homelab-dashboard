import type { ProwlarrData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Prowlarr({ data }: { data: ProwlarrData }) {
  return (
    <StatTile
      title="Prowlarr"
      metrics={[
        { label: 'indexers', value: data.indexers },
        { label: 'enabled', value: data.enabled },
        { label: 'grabs', value: data.grabs },
        { label: 'queries', value: data.queries },
      ]}
    />
  );
}

import type { OverseerrData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Overseerr({ data }: { data: OverseerrData }) {
  return (
    <StatTile
      title="Overseerr"
      metrics={[
        { label: 'pending', value: data.pending },
        { label: 'processing', value: data.processing },
        { label: 'available', value: data.available },
      ]}
    />
  );
}

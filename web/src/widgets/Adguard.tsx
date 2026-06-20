import type { AdguardData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Adguard({ data }: { data: AdguardData }) {
  return (
    <StatTile
      title="AdGuard"
      metrics={[
        { label: 'queries', value: data.queries.toLocaleString() },
        { label: 'blocked', value: data.blocked.toLocaleString() },
        { label: 'blocked %', value: `${data.blockedPct}%` },
      ]}
    />
  );
}

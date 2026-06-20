import { summarizeFleet, type Host } from '@dashboard/shared';
import { StatusDot } from './StatusDot.tsx';
import { formatUsage, formatRelative } from '../format.ts';
import styles from './FleetSummary.module.css';

export function FleetSummary({ hosts, updatedAt }: { hosts: Host[]; updatedAt: number }) {
  const s = summarizeFleet(hosts);
  const allUp = s.up === s.total;
  return (
    <div className={styles.strip}>
      <span className={styles.up}>
        <StatusDot status={allUp ? 'ok' : 'warn'} />
        {s.up} / {s.total} hosts up
      </span>
      <span>CPU <b>{s.cpuPercent}%</b></span>
      <span>RAM <b>{formatUsage(s.memUsedBytes, s.memTotalBytes)}</b></span>
      <span>Storage <b>{formatUsage(s.diskUsedBytes, s.diskTotalBytes)}</b></span>
      <span className={styles.updated}>updated {formatRelative(new Date(updatedAt).toISOString())}</span>
    </div>
  );
}

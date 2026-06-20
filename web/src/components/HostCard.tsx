import { type Host, DEFAULT_THRESHOLDS, metricStatus, pct } from '@dashboard/shared';
import { StatusDot } from './StatusDot.tsx';
import { MetricBar } from './MetricBar.tsx';
import { formatUsage, formatUptime } from '../format.ts';
import styles from './HostCard.module.css';

export function HostCard({ host }: { host: Host }) {
  const m = host.metrics;
  const down = host.status === 'down';

  if (host.kind === 'storage') {
    const diskPct = pct(m.diskUsedBytes, m.diskTotalBytes);
    return (
      <div className={`${styles.card} ${down ? styles.down : ''}`}>
        <div className={styles.name}>
          <StatusDot status={host.status} />
          {host.label}
          {down && <span className={styles.unreachable}>unreachable</span>}
        </div>
        <MetricBar
          label="Storage"
          valueText={formatUsage(m.diskUsedBytes, m.diskTotalBytes)}
          percent={diskPct}
          status={metricStatus(diskPct)}
        />
      </div>
    );
  }

  const memPct = pct(m.memUsedBytes, m.memTotalBytes);
  const diskPct = pct(m.diskUsedBytes, m.diskTotalBytes);

  return (
    <div className={`${styles.card} ${down ? styles.down : ''}`}>
      <div className={styles.name}>
        <StatusDot status={host.status} />
        {host.label}
        {down && <span className={styles.unreachable}>unreachable</span>}
      </div>

      <MetricBar label="CPU" valueText={`${m.cpuPercent}%`} percent={m.cpuPercent} status={metricStatus(m.cpuPercent, DEFAULT_THRESHOLDS)} />
      <MetricBar label="RAM" valueText={formatUsage(m.memUsedBytes, m.memTotalBytes)} percent={memPct} status={metricStatus(memPct)} />
      <MetricBar label="Disk" valueText={formatUsage(m.diskUsedBytes, m.diskTotalBytes)} percent={diskPct} status={metricStatus(diskPct)} />

      {m.gpu && (
        <>
          <MetricBar label="GPU" valueText={`${m.gpu.utilPercent}%`} percent={m.gpu.utilPercent} status={metricStatus(m.gpu.utilPercent)} />
          <MetricBar
            label="VRAM"
            valueText={formatUsage(m.gpu.vramUsedBytes, m.gpu.vramTotalBytes)}
            percent={pct(m.gpu.vramUsedBytes, m.gpu.vramTotalBytes)}
            status={metricStatus(pct(m.gpu.vramUsedBytes, m.gpu.vramTotalBytes))}
          />
        </>
      )}

      <div className={styles.foot}>
        <span>{formatUptime(m.uptimeSeconds)}</span>
        <span>{m.tempC != null ? `${m.tempC}°C` : '—'}</span>
        <span>{m.load[0].toFixed(2)}</span>
      </div>
    </div>
  );
}

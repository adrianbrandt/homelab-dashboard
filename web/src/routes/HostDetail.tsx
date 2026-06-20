import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SERIES_WINDOWS, type SeriesWindow } from '@dashboard/shared';
import { useHosts } from '../hooks/useHosts.ts';
import { useHostDetail } from '../hooks/useHostDetail.ts';
import { useHostSeries } from '../hooks/useHostSeries.ts';
import { Sparkline } from '../components/Sparkline.tsx';
import { StatusDot } from '../components/StatusDot.tsx';
import { formatUsage, formatUptime, formatRate } from '../format.ts';
import styles from './HostDetail.module.css';

export function HostDetail() {
  const { id = '' } = useParams();
  const [window, setWindow] = useState<SeriesWindow>('6h');
  const hostsQ = useHosts();
  const detailQ = useHostDetail(id);
  const seriesQ = useHostSeries(id, window);

  const host = hostsQ.data?.hosts.find((h) => h.id === id);

  const detailError = detailQ.isError && !detailQ.data;

  if ((hostsQ.data && !host) || detailError || hostsQ.isError) {
    return (
      <div className={styles.page}>
        <Link to="/" className={styles.back}>&larr; Overview</Link>
        <p className={styles.muted}>Host &ldquo;{id}&rdquo; not found or could not be loaded.</p>
      </div>
    );
  }

  if (!host || !detailQ.data) {
    return (
      <div className={styles.page}>
        <Link to="/" className={styles.back}>&larr; Overview</Link>
        <p className={styles.muted}>Loading…</p>
      </div>
    );
  }

  const d = detailQ.data;
  const m = host.metrics;
  const s = seriesQ.data?.metrics;
  const net = d.network[0];

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <Link to="/" className={styles.back}>&larr; Overview</Link>
          <div className={styles.heading}>
            <StatusDot status={host.status} />
            {host.label}
          </div>
        </div>
        <div className={styles.toggle} data-testid="range-toggle">
          {SERIES_WINDOWS.map((w) => (
            <button key={w} className={w === window ? styles.on : ''} onClick={() => setWindow(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>CPU · {m.cpuPercent}%</div>
            <Sparkline points={s?.cpu ?? []} formatValue={(v) => `${Math.round(v)}%`} />
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>RAM · {formatUsage(m.memUsedBytes, m.memTotalBytes)}</div>
            <Sparkline points={s?.ram ?? []} formatValue={(v) => `${Math.round(v)}%`} />
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>Disk · /</div>
            <Sparkline points={s?.disk ?? []} formatValue={(v) => `${Math.round(v)}%`} />
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>Temp · {m.tempC != null ? `${m.tempC}°C` : '—'}</div>
            <Sparkline points={s?.temp ?? []} formatValue={(v) => `${Math.round(v)}°`} />
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>Load · {m.load[0].toFixed(2)}</div>
            <Sparkline points={s?.load ?? []} formatValue={(v) => v.toFixed(2)} />
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>
              Network {net ? `· ↓${formatRate(net.rxBytesPerSec)} ↑${formatRate(net.txBytesPerSec)}` : ''}
            </div>
            <Sparkline points={s?.netRx ?? []} formatValue={(v) => formatRate(v)} />
          </div>
        </div>

        <div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>Status</div>
            <div className={styles.heading}><StatusDot status={host.status} /> {host.status}</div>
            <div className={styles.muted}>{formatUptime(m.uptimeSeconds)} · load {m.load[0].toFixed(2)}</div>
          </div>
          <div className={styles.panel}>
            <div className={styles.ptitle}>System</div>
            <div className={styles.kv}><span>Kernel</span><span>{d.kernel || '—'}</span></div>
            <div className={styles.kv}><span>OS</span><span>{d.os || '—'}</span></div>
            <div className={styles.kv}><span>Cores</span><span>{d.cpuCores.length}</span></div>
            {d.filesystems.map((f) => (
              <div className={styles.kv} key={f.mountpoint}>
                <span>{f.mountpoint}</span>
                <span>{formatUsage(f.usedBytes, f.totalBytes)}</span>
              </div>
            ))}
            {d.temps.map((t) => (
              <div className={styles.kv} key={t.label}>
                <span>{t.label}</span>
                <span>{t.celsius}°C</span>
              </div>
            ))}
          </div>
          {host.links.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.ptitle}>Quick links</div>
              <div className={styles.links}>
                {host.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

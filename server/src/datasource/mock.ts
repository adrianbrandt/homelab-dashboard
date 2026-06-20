import {
  deriveStatus,
  windowToRange,
  type Container,
  type ContainersResponse,
  type DataSource,
  type Host,
  type HostDetail,
  type HostMetrics,
  type HostSeries,
  type SeriesMetric,
  type SeriesPoint,
  type SeriesWindow,
  type Thresholds,
} from '@dashboard/shared';
import type { HostConfig } from '../config.ts';

const GB = 1024 ** 3;

interface Base {
  cpu: number;
  memTotal: number;
  memUsedFrac: number;
  diskTotal: number;
  diskUsedFrac: number;
  temp: number;
  uptime: number;
  load: number;
  gpu?: { total: number; usedFrac: number; util: number; temp: number };
}

const BASES: Record<string, Base> = {
  homelab: { cpu: 4, memTotal: 14 * GB, memUsedFrac: 0.14, diskTotal: 233 * GB, diskUsedFrac: 0.08, temp: 42, uptime: 17 * 86400, load: 0.04 },
  kvm4: { cpu: 22, memTotal: 16 * GB, memUsedFrac: 0.69, diskTotal: 200 * GB, diskUsedFrac: 0.7, temp: 51, uptime: 41 * 86400, load: 1.1 },
  acer: { cpu: 31, memTotal: 16 * GB, memUsedFrac: 0.38, diskTotal: 500 * GB, diskUsedFrac: 0.24, temp: 58, uptime: 3 * 86400, load: 0.81, gpu: { total: 6 * GB, usedFrac: 0.35, util: 40, temp: 62 } },
};

const FALLBACK: Base = { cpu: 10, memTotal: 8 * GB, memUsedFrac: 0.3, diskTotal: 100 * GB, diskUsedFrac: 0.3, temp: 45, uptime: 86400, load: 0.2 };

const MOCK_CONTAINERS: Array<{ name: string; image: string; cpu: number; mem: number; limit: number; uptime: number }> = [
  { name: 'prometheus', image: 'prom/prometheus:v3.12.0', cpu: 6, mem: 320 * (1024 ** 2), limit: 0, uptime: 17 * 86400 },
  { name: 'grafana', image: 'grafana/grafana:11.4.0', cpu: 3, mem: 180 * (1024 ** 2), limit: 512 * (1024 ** 2), uptime: 17 * 86400 },
  { name: 'sonarr', image: 'linuxserver/sonarr:4.0', cpu: 2, mem: 240 * (1024 ** 2), limit: 0, uptime: 9 * 86400 },
  { name: 'radarr', image: 'linuxserver/radarr:5.0', cpu: 2, mem: 220 * (1024 ** 2), limit: 0, uptime: 9 * 86400 },
  { name: 'caddy', image: 'caddy:2.8-alpine', cpu: 1, mem: 40 * (1024 ** 2), limit: 128 * (1024 ** 2), uptime: 17 * 86400 },
  { name: 'cadvisor', image: 'gcr.io/cadvisor/cadvisor:v0.49.1', cpu: 4, mem: 90 * (1024 ** 2), limit: 0, uptime: 17 * 86400 },
];

function jitter(base: number, amount: number): number {
  return Math.max(0, base + (Math.random() * 2 - 1) * amount);
}

export class MockDataSource implements DataSource {
  private readonly hosts: HostConfig[];
  private readonly thresholds: Thresholds;

  constructor(hosts: HostConfig[], thresholds: Thresholds) {
    this.hosts = hosts;
    this.thresholds = thresholds;
  }

  async getHosts(): Promise<Host[]> {
    const now = new Date().toISOString();
    return this.hosts.map((h) => {
      if (h.kind === 'storage') {
        const diskTotal = 2000 * GB;
        const metrics: HostMetrics = {
          cpuPercent: 0,
          memUsedBytes: 0,
          memTotalBytes: 0,
          diskUsedBytes: Math.round(diskTotal * Math.min(0.99, jitter(0.04, 0.005))),
          diskTotalBytes: diskTotal,
          tempC: null,
          uptimeSeconds: 0,
          load: [0, 0, 0],
          gpu: null,
        };
        const unreachable = Math.random() < 0.04;
        return {
          id: h.id,
          label: h.label,
          kind: 'storage' as const,
          links: h.links ?? [],
          status: deriveStatus(metrics, this.thresholds, unreachable),
          metrics,
          lastUpdated: now,
        };
      }
      const base = BASES[h.id] ?? FALLBACK;
      const metrics: HostMetrics = {
        cpuPercent: Math.round(Math.min(100, jitter(base.cpu, 6))),
        memUsedBytes: Math.round(base.memTotal * Math.min(0.99, jitter(base.memUsedFrac, 0.04))),
        memTotalBytes: base.memTotal,
        diskUsedBytes: Math.round(base.diskTotal * base.diskUsedFrac),
        diskTotalBytes: base.diskTotal,
        tempC: Math.round(jitter(base.temp, 3)),
        uptimeSeconds: base.uptime,
        load: [Number(jitter(base.load, 0.2).toFixed(2)), base.load, base.load],
        gpu: base.gpu
          ? {
              utilPercent: Math.round(Math.min(100, jitter(base.gpu.util, 15))),
              vramUsedBytes: Math.round(base.gpu.total * Math.min(0.99, jitter(base.gpu.usedFrac, 0.05))),
              vramTotalBytes: base.gpu.total,
              tempC: Math.round(jitter(base.gpu.temp, 4)),
            }
          : null,
      };
      // ~4% chance per poll a host reads as unreachable, so the 'down' state is
      // visible during development without hand-faking data.
      const unreachable = Math.random() < 0.04;
      return {
        id: h.id,
        label: h.label,
        links: h.links ?? [],
        status: deriveStatus(metrics, this.thresholds, unreachable),
        metrics,
        lastUpdated: now,
      };
    });
  }

  async getHostDetail(id: string): Promise<HostDetail | null> {
    const cfg = this.hosts.find((h) => h.id === id);
    if (!cfg || cfg.kind === 'storage') return null;
    const base = BASES[id] ?? FALLBACK;
    // 4 deterministic cores spread around the host's average.
    const cpuCores = [0, 1, 2, 3].map((i) =>
      Math.round(Math.min(100, Math.max(0, base.cpu + (i - 1.5) * 4))),
    );
    const filesystems = [
      { mountpoint: '/', usedBytes: Math.round(base.diskTotal * base.diskUsedFrac), totalBytes: base.diskTotal },
    ];
    if (id === 'homelab') {
      filesystems.push({ mountpoint: '/mnt/nas-media', usedBytes: Math.round(2 * GB), totalBytes: Math.round(2000 * GB) });
    }
    return {
      id,
      cpuCores,
      filesystems,
      // kvm4 stands in for a VPS with no coretemp sensor.
      temps: id === 'kvm4' ? [] : [{ label: 'Package id 0', celsius: base.temp }],
      network: [{ device: 'eth0', rxBytesPerSec: 2_000_000, txBytesPerSec: 400_000 }],
      bootTime: Math.floor(Date.now() / 1000) - base.uptime,
      kernel: '6.8.0-mock',
      os: 'Ubuntu 26.04 (mock)',
    };
  }

  async getContainers(): Promise<ContainersResponse> {
    const containers: Container[] = MOCK_CONTAINERS.map((c) => ({
      name: c.name,
      image: c.image,
      cpuPercent: Number(jitter(c.cpu, 1.5).toFixed(1)),
      memUsedBytes: Math.round(jitter(c.mem, c.mem * 0.1)),
      memLimitBytes: c.limit,
      uptimeSeconds: c.uptime,
    })).sort((a, b) => b.cpuPercent - a.cpuPercent);
    return { containers, generatedAt: new Date().toISOString() };
  }

  async getHostSeries(id: string, window: SeriesWindow): Promise<HostSeries> {
    const { rangeSeconds, stepSeconds } = windowToRange(window);
    const end = Math.floor(Date.now() / 1000);
    const n = Math.floor(rangeSeconds / stepSeconds);
    const base = BASES[id] ?? FALLBACK;
    const centers: Record<SeriesMetric, number> = {
      cpu: base.cpu,
      ram: base.memUsedFrac * 100,
      disk: base.diskUsedFrac * 100,
      temp: base.temp,
      load: base.load,
      netRx: 2_000_000,
      netTx: 400_000,
    };
    const metrics = {} as Record<SeriesMetric, SeriesPoint[]>;
    (Object.keys(centers) as SeriesMetric[]).forEach((k, ki) => {
      const center = centers[k];
      metrics[k] = Array.from({ length: n }, (_, i) => {
        // Deterministic sine wave (seeded by metric index) so charts are stable.
        const v = Math.max(0, center + Math.sin((i / n) * Math.PI * 4 + ki) * center * 0.15);
        return { t: end - (n - i) * stepSeconds, v: Number(v.toFixed(2)) };
      });
    });
    return { id, window, stepSeconds, metrics };
  }
}

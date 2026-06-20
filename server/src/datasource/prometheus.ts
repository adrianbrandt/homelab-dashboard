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

/** A single series from Prometheus `/api/v1/query` (instant vector). */
export interface PromVector {
  metric: Record<string, string>;
  value: [number, string];
}

/** Runs one PromQL instant query, returns its result vector. */
export type QueryFn = (expr: string) => Promise<PromVector[]>;

/** A single series from Prometheus `/api/v1/query_range` (range vector). */
export interface PromMatrix {
  metric: Record<string, string>;
  values: [number, string][];
}

/** Runs one PromQL range query, returns its result matrix. */
export type QueryRangeFn = (
  expr: string,
  start: number,
  end: number,
  step: number,
) => Promise<PromMatrix[]>;

/**
 * PromQL expressions, each written to return one series per `instance` label so
 * the whole fleet is fetched in a fixed number of queries regardless of host
 * count. Host id === Prometheus `instance` label (set in the scrape config).
 */
const QUERIES = {
  // CPU busy % = 100 − idle rate. 2m window smooths the 15s scrape.
  cpu: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)',
  memTotal: 'node_memory_MemTotal_bytes',
  memAvail: 'node_memory_MemAvailable_bytes',
  // Root filesystem only — exclude NFS/boot/tmpfs mounts.
  diskTotal: 'node_filesystem_size_bytes{mountpoint="/"}',
  diskAvail: 'node_filesystem_avail_bytes{mountpoint="/"}',
  // CPU package/core temp; hosts without a coretemp chip (e.g. VPS) return empty → null.
  temp: 'max by (instance) (node_hwmon_temp_celsius{chip=~"platform_coretemp.*"})',
  // Host clock, not Prometheus clock, to avoid skew.
  uptime: 'node_time_seconds - node_boot_time_seconds',
  load1: 'node_load1',
  load5: 'node_load5',
  load15: 'node_load15',
  // Reachability: 1 when the node scrape succeeded. Missing ⇒ host not scraped ⇒ down.
  up: 'up{job="node"}',
} as const;

type MetricKey = keyof typeof QUERIES;
type Maps = Record<MetricKey, Record<string, number>>;

/** Index a result vector by its `instance` label, dropping NaN values. */
function toMap(vec: PromVector[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of vec) {
    const inst = r.metric.instance;
    if (inst == null) continue;
    const v = Number(r.value[1]);
    if (!Number.isNaN(v)) m[inst] = v;
  }
  return m;
}

/** Index a result vector by its `name` label, dropping NaN values. */
function toNameMap(vec: PromVector[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of vec) {
    const name = r.metric.name;
    if (!name) continue;
    const v = Number(r.value[1]);
    if (!Number.isNaN(v)) m[name] = v;
  }
  return m;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const ZERO_METRICS: HostMetrics = {
  cpuPercent: 0,
  memUsedBytes: 0,
  memTotalBytes: 0,
  diskUsedBytes: 0,
  diskTotalBytes: 0,
  tempC: null,
  uptimeSeconds: 0,
  load: [0, 0, 0],
  gpu: null,
};

/** Assemble one host's metrics from the per-instance maps. */
export function buildMetrics(instance: string, maps: Maps): HostMetrics {
  const memTotal = maps.memTotal[instance] ?? 0;
  const memAvail = maps.memAvail[instance] ?? 0;
  const diskTotal = maps.diskTotal[instance] ?? 0;
  const diskAvail = maps.diskAvail[instance] ?? 0;
  const round2 = (n: number) => Number(n.toFixed(2));
  return {
    cpuPercent: Math.round(clamp(maps.cpu[instance] ?? 0, 0, 100)),
    memUsedBytes: Math.max(0, Math.round(memTotal - memAvail)),
    memTotalBytes: Math.round(memTotal),
    diskUsedBytes: Math.max(0, Math.round(diskTotal - diskAvail)),
    diskTotalBytes: Math.round(diskTotal),
    tempC: instance in maps.temp ? Math.round(maps.temp[instance]) : null,
    uptimeSeconds: Math.max(0, Math.round(maps.uptime[instance] ?? 0)),
    load: [
      round2(maps.load1[instance] ?? 0),
      round2(maps.load5[instance] ?? 0),
      round2(maps.load15[instance] ?? 0),
    ],
    // TODO: GPU once nvidia_gpu_exporter lands on the Acer (roadmap).
    gpu: null,
  };
}

/** HTTP-backed query fn against a Prometheus server, with a request timeout. */
function makeHttpQuery(baseUrl: string, timeoutMs = 5000): QueryFn {
  const root = baseUrl.replace(/\/$/, '');
  return async (expr) => {
    const url = `${root}/api/v1/query?query=${encodeURIComponent(expr)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`prometheus HTTP ${res.status}`);
    const json = (await res.json()) as { status: string; data?: { result: PromVector[] } };
    if (json.status !== 'success' || !json.data) {
      throw new Error(`prometheus query failed: ${expr}`);
    }
    return json.data.result;
  };
}

/** HTTP-backed range query fn against a Prometheus server, with a request timeout. */
function makeHttpQueryRange(baseUrl: string, timeoutMs = 8000): QueryRangeFn {
  const root = baseUrl.replace(/\/$/, '');
  return async (expr, start, end, step) => {
    const url = `${root}/api/v1/query_range?query=${encodeURIComponent(expr)}&start=${start}&end=${end}&step=${step}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`prometheus HTTP ${res.status}`);
    const json = (await res.json()) as { status: string; data?: { result: PromMatrix[] } };
    if (json.status !== 'success' || !json.data) {
      throw new Error(`prometheus range query failed: ${expr}`);
    }
    return json.data.result;
  };
}

/** Take the first series of a matrix → SeriesPoint[], NaN → null. */
function matrixToPoints(m: PromMatrix[]): SeriesPoint[] {
  if (!m.length) return [];
  return m[0].values.map(([t, v]) => {
    const n = Number(v);
    return { t: Math.round(t), v: Number.isNaN(n) ? null : n };
  });
}

export class PrometheusDataSource implements DataSource {
  private readonly hosts: HostConfig[];
  private readonly thresholds: Thresholds;
  private readonly query: QueryFn;
  private readonly queryRange: QueryRangeFn;

  constructor(
    hosts: HostConfig[],
    thresholds: Thresholds,
    opts: { baseUrl?: string; query?: QueryFn; queryRange?: QueryRangeFn } = {},
  ) {
    this.hosts = hosts;
    this.thresholds = thresholds;
    const base = opts.baseUrl ?? 'http://127.0.0.1:9090';
    this.query = opts.query ?? makeHttpQuery(base);
    this.queryRange = opts.queryRange ?? makeHttpQueryRange(base);
  }

  private async buildStorageHost(h: HostConfig, now: string): Promise<Host> {
    const src = h.source;
    const sel = `instance="${src.instance}",mountpoint="${src.mountpoint}"`;
    const q = (expr: string) => this.query(expr).catch(() => [] as PromVector[]);
    const [size, avail] = await Promise.all([
      q(`node_filesystem_size_bytes{${sel}}`),
      q(`node_filesystem_avail_bytes{${sel}}`),
    ]);
    const sizeMap = toMap(size);
    const availMap = toMap(avail);
    const reachable = src.instance in sizeMap;
    const total = sizeMap[src.instance] ?? 0;
    const used = Math.max(0, total - (availMap[src.instance] ?? 0));
    const metrics: HostMetrics = {
      ...ZERO_METRICS,
      diskUsedBytes: Math.round(used),
      diskTotalBytes: Math.round(total),
    };
    return {
      id: h.id,
      label: h.label,
      kind: 'storage',
      links: h.links ?? [],
      status: deriveStatus(metrics, this.thresholds, !reachable),
      metrics,
      lastUpdated: now,
    };
  }

  async getHosts(): Promise<Host[]> {
    const keys = Object.keys(QUERIES) as MetricKey[];
    // A single failed query (e.g. one metric missing) must not blank the whole
    // fleet — degrade per-query to an empty vector instead.
    const results = await Promise.all(
      keys.map((k) => this.query(QUERIES[k]).catch(() => [] as PromVector[])),
    );
    const maps = {} as Maps;
    keys.forEach((k, i) => {
      maps[k] = toMap(results[i]);
    });

    const now = new Date().toISOString();
    return Promise.all(
      this.hosts.map(async (h) => {
        if (h.kind === 'storage') return this.buildStorageHost(h, now);
        const reachable = (maps.up[h.id] ?? 0) === 1;
        const metrics = reachable ? buildMetrics(h.id, maps) : { ...ZERO_METRICS };
        return {
          id: h.id,
          label: h.label,
          links: h.links ?? [],
          status: deriveStatus(metrics, this.thresholds, !reachable),
          metrics,
          lastUpdated: now,
        };
      }),
    );
  }

  async getHostDetail(id: string): Promise<HostDetail | null> {
    const cfg = this.hosts.find((h) => h.id === id);
    if (!cfg || cfg.kind === 'storage') return null;
    const sel = `instance="${id}"`;
    const fsFilter = `${sel},fstype!~"tmpfs|overlay|squashfs|ramfs|devtmpfs"`;
    const netFilter = `${sel},device!~"lo|veth.*|docker.*|br.*"`;
    const q = (expr: string) => this.query(expr).catch(() => [] as PromVector[]);

    const [cores, fsSize, fsAvail, temps, rx, tx, boot, uname, os] = await Promise.all([
      q(`100 - (rate(node_cpu_seconds_total{mode="idle",${sel}}[2m]) * 100)`),
      q(`node_filesystem_size_bytes{${fsFilter}}`),
      q(`node_filesystem_avail_bytes{${fsFilter}}`),
      q(`node_hwmon_temp_celsius{${sel}}`),
      q(`rate(node_network_receive_bytes_total{${netFilter}}[2m])`),
      q(`rate(node_network_transmit_bytes_total{${netFilter}}[2m])`),
      q(`node_boot_time_seconds{${sel}}`),
      q(`node_uname_info{${sel}}`),
      q(`node_os_info{${sel}}`),
    ]);

    const cpuCores = cores
      .map((r) => ({ idx: Number(r.metric.cpu), v: Number(r.value[1]) }))
      .filter((c) => Number.isFinite(c.idx) && !Number.isNaN(c.v))
      .sort((a, b) => a.idx - b.idx)
      .map((c) => Math.round(clamp(c.v, 0, 100)));

    const availByMount: Record<string, number> = {};
    for (const r of fsAvail) availByMount[r.metric.mountpoint] = Number(r.value[1]);
    const filesystems = fsSize
      .map((r) => {
        const total = Number(r.value[1]);
        const avail = availByMount[r.metric.mountpoint] ?? 0;
        return {
          mountpoint: r.metric.mountpoint,
          usedBytes: Math.max(0, Math.round(total - avail)),
          totalBytes: Math.round(total),
        };
      })
      .sort((a, b) => a.mountpoint.localeCompare(b.mountpoint));

    const tempInfos = temps
      .map((r) => ({ label: r.metric.sensor ?? r.metric.chip ?? 'temp', celsius: Math.round(Number(r.value[1])) }))
      .filter((t) => !Number.isNaN(t.celsius));

    const txByDev: Record<string, number> = {};
    for (const r of tx) txByDev[r.metric.device] = Number(r.value[1]);
    const network = rx
      .map((r) => ({
        device: r.metric.device,
        rxBytesPerSec: Math.max(0, Math.round(Number(r.value[1]))),
        txBytesPerSec: Math.max(0, Math.round(txByDev[r.metric.device] ?? 0)),
      }))
      .sort((a, b) => a.device.localeCompare(b.device));

    return {
      id,
      cpuCores,
      filesystems,
      temps: tempInfos,
      network,
      bootTime: boot.length ? Math.round(Number(boot[0].value[1])) : 0,
      kernel: uname.length ? (uname[0].metric.release ?? '') : '',
      os: os.length ? (os[0].metric.pretty_name ?? '') : '',
    };
  }

  async getContainers(): Promise<ContainersResponse> {
    const q = (expr: string) => this.query(expr).catch(() => [] as PromVector[]);
    const [coresVec, cpuVec, memVec, limitVec, startVec] = await Promise.all([
      // cAdvisor runs on the homelab host; normalize CPU to that host's core count.
      q(`count(count by (cpu) (node_cpu_seconds_total{instance="homelab"}))`),
      q(`sum by (name, image) (rate(container_cpu_usage_seconds_total{name!=""}[2m])) * 100`),
      q(`container_memory_working_set_bytes{name!=""}`),
      q(`container_spec_memory_limit_bytes{name!=""}`),
      q(`time() - container_start_time_seconds{name!=""}`),
    ]);

    const cores = coresVec.length ? Number(coresVec[0].value[1]) : 1;
    const coreCount = Number.isFinite(cores) && cores > 0 ? cores : 1;
    const memMap = toNameMap(memVec);
    const limitMap = toNameMap(limitVec);
    const startMap = toNameMap(startVec);

    const containers: Container[] = cpuVec
      .filter((r) => r.metric.name)
      .map((r) => {
        const name = r.metric.name;
        const cpuRaw = Number(r.value[1]);
        const rawLimit = limitMap[name] ?? 0;
        // cAdvisor reports the cgroup max (a huge sentinel) when unlimited → treat as 0.
        const memLimitBytes = rawLimit > 0 && rawLimit <= Number.MAX_SAFE_INTEGER ? Math.round(rawLimit) : 0;
        return {
          name,
          image: r.metric.image ?? '',
          cpuPercent: Number((Math.max(0, cpuRaw) / coreCount).toFixed(1)),
          memUsedBytes: Math.max(0, Math.round(memMap[name] ?? 0)),
          memLimitBytes,
          uptimeSeconds: Math.max(0, Math.round(startMap[name] ?? 0)),
        };
      })
      .sort((a, b) => b.cpuPercent - a.cpuPercent);

    return { containers, generatedAt: new Date().toISOString() };
  }

  async getHostSeries(id: string, window: SeriesWindow): Promise<HostSeries> {
    const { rangeSeconds, stepSeconds } = windowToRange(window);
    const end = Math.floor(Date.now() / 1000);
    const start = end - rangeSeconds;
    const sel = `instance="${id}"`;
    const netFilter = `${sel},device!~"lo|veth.*|docker.*|br.*"`;
    const exprs: Record<SeriesMetric, string> = {
      cpu: `100 - (avg(rate(node_cpu_seconds_total{mode="idle",${sel}}[2m])) * 100)`,
      ram: `(1 - node_memory_MemAvailable_bytes{${sel}} / node_memory_MemTotal_bytes{${sel}}) * 100`,
      disk: `(1 - node_filesystem_avail_bytes{${sel},mountpoint="/"} / node_filesystem_size_bytes{${sel},mountpoint="/"}) * 100`,
      temp: `max(node_hwmon_temp_celsius{chip=~"platform_coretemp.*",${sel}})`,
      load: `node_load1{${sel}}`,
      netRx: `sum(rate(node_network_receive_bytes_total{${netFilter}}[2m]))`,
      netTx: `sum(rate(node_network_transmit_bytes_total{${netFilter}}[2m]))`,
    };
    const keys = Object.keys(exprs) as SeriesMetric[];
    const results = await Promise.all(
      keys.map((k) => this.queryRange(exprs[k], start, end, stepSeconds).catch(() => [] as PromMatrix[])),
    );
    const metrics = {} as Record<SeriesMetric, SeriesPoint[]>;
    keys.forEach((k, i) => {
      metrics[k] = matrixToPoints(results[i]);
    });
    return { id, window, stepSeconds, metrics };
  }
}

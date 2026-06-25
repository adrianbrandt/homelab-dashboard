export const API_BASE = '/api';

export interface ApiResponse<T> {
  data: T;
}

export type HostStatus = 'ok' | 'warn' | 'down';

export interface GpuMetrics {
  utilPercent: number;
  vramUsedBytes: number;
  vramTotalBytes: number;
  tempC: number;
}

export interface HostMetrics {
  cpuPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  tempC: number | null;
  uptimeSeconds: number;
  load: [number, number, number];
  gpu?: GpuMetrics | null;
}

export interface Host {
  id: string;
  label: string;
  kind?: 'compute' | 'storage'; // absent ⇒ compute; 'storage' = disk-only (e.g. NAS)
  status: HostStatus;
  links: HostLink[];
  metrics: HostMetrics;
  lastUpdated: string;
}

export interface HostsResponse {
  hosts: Host[];
  generatedAt: string;
}

export interface Container {
  name: string;
  image: string;
  cpuPercent: number; // % of the whole host (normalized by core count)
  memUsedBytes: number;
  memLimitBytes: number; // 0 ⇒ unlimited
  uptimeSeconds: number;
}

export interface ContainersResponse {
  containers: Container[];
  generatedAt: string;
}

export interface Thresholds {
  usageWarnPercent: number;
  tempWarnC: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  usageWarnPercent: 80,
  tempWarnC: 80,
};

export interface DataSource {
  getHosts(): Promise<Host[]>;
  getHostDetail(id: string): Promise<HostDetail | null>;
  getHostSeries(id: string, window: SeriesWindow): Promise<HostSeries>;
  getContainers(): Promise<ContainersResponse>;
}

/** Percentage 0–100 of used/total, guarding divide-by-zero. */
export function pct(used: number, total: number): number {
  if (total <= 0) return 0;
  return (used / total) * 100;
}

/** Per-bar status: a single usage percentage is 'warn' at/above the threshold. */
export function metricStatus(
  percent: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): 'ok' | 'warn' {
  return percent >= thresholds.usageWarnPercent ? 'warn' : 'ok';
}

/**
 * Host status = worst of CPU/RAM/disk usage + temperature.
 * `unreachable` forces 'down' and overrides everything else.
 * Using metricStatus here keeps the status dot and the bar colors in agreement.
 */
export function deriveStatus(
  metrics: HostMetrics,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  unreachable = false,
): HostStatus {
  if (unreachable) return 'down';
  const usageWarn =
    metricStatus(metrics.cpuPercent, thresholds) === 'warn' ||
    metricStatus(pct(metrics.memUsedBytes, metrics.memTotalBytes), thresholds) === 'warn' ||
    metricStatus(pct(metrics.diskUsedBytes, metrics.diskTotalBytes), thresholds) === 'warn';
  const tempWarn = metrics.tempC != null && metrics.tempC >= thresholds.tempWarnC;
  return usageWarn || tempWarn ? 'warn' : 'ok';
}

export interface HostLink {
  label: string;
  url: string;
}

export interface FsInfo {
  mountpoint: string;
  usedBytes: number;
  totalBytes: number;
}

export interface TempInfo {
  label: string;
  celsius: number;
}

export interface NetIo {
  device: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

/** Extra per-host system info, on top of the headline metrics in `Host`. */
export interface HostDetail {
  id: string;
  cpuCores: number[]; // per-core busy %, ordered by core index
  filesystems: FsInfo[]; // real mounts only
  temps: TempInfo[]; // [] where no sensor (e.g. a VPS)
  network: NetIo[]; // physical NICs only
  bootTime: number; // epoch seconds; 0 when unknown
  kernel: string;
  os: string;
}

export type SeriesWindow = '1h' | '6h' | '24h';
export const SERIES_WINDOWS: SeriesWindow[] = ['1h', '6h', '24h'];

export interface SeriesPoint {
  t: number; // epoch seconds
  v: number | null; // null = gap (missing/NaN)
}

export type SeriesMetric = 'cpu' | 'ram' | 'disk' | 'temp' | 'load' | 'netRx' | 'netTx';

export interface HostSeries {
  id: string;
  window: SeriesWindow;
  stepSeconds: number;
  metrics: Record<SeriesMetric, SeriesPoint[]>;
}

export interface RangeSpec {
  rangeSeconds: number;
  stepSeconds: number;
}

const WINDOW_RANGES: Record<SeriesWindow, RangeSpec> = {
  '1h': { rangeSeconds: 3600, stepSeconds: 30 },
  '6h': { rangeSeconds: 21600, stepSeconds: 300 },
  '24h': { rangeSeconds: 86400, stepSeconds: 900 },
};

/** Range + step for a window. Unknown windows fall back to 6h. */
export function windowToRange(window: SeriesWindow): RangeSpec {
  return WINDOW_RANGES[window] ?? WINDOW_RANGES['6h'];
}

export interface FleetTotals {
  total: number;
  up: number;
  cpuPercent: number; // avg over up hosts, rounded
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
}

/** Aggregate the fleet for the overview summary strip. Sums/averages over up hosts only. */
export function summarizeFleet(hosts: Host[]): FleetTotals {
  const compute = hosts.filter((h) => h.kind !== 'storage');
  const up = compute.filter((h) => h.status !== 'down');
  const sum = (sel: (m: HostMetrics) => number) => up.reduce((a, h) => a + sel(h.metrics), 0);
  const cpuAvg = up.length ? sum((m) => m.cpuPercent) / up.length : 0;
  return {
    total: compute.length,
    up: up.length,
    cpuPercent: Math.round(cpuAvg),
    memUsedBytes: sum((m) => m.memUsedBytes),
    memTotalBytes: sum((m) => m.memTotalBytes),
    diskUsedBytes: sum((m) => m.diskUsedBytes),
    diskTotalBytes: sum((m) => m.diskTotalBytes),
  };
}

// ── Widgets (service tiles) ──────────────────────────────────────────────
export interface BookmarkItem {
  label: string;
  url: string;
}
export interface BookmarksData {
  items: BookmarkItem[];
}

export interface WidgetMeta {
  id: string;
  type: string;
}
export interface WidgetGroup {
  name: string;
  widgets: WidgetMeta[];
}
export type ThemeMode = 'dark' | 'light' | 'auto';
export type ThemeDensity = 'comfortable' | 'compact';
export interface ThemeConfig {
  mode: ThemeMode;
  density: ThemeDensity;
  accent?: string;
}
export interface LayoutSettings {
  title: string;
  theme: ThemeConfig;
}
export interface LayoutResponse {
  settings: LayoutSettings;
  groups: WidgetGroup[];
}

export type WidgetResult<D = unknown> =
  | { ok: true; data: D }
  | { ok: false; error: string };

export interface SonarrData {
  queue: number;
  series: number;
  upcoming: number;
}
export interface RadarrData {
  queue: number;
  movies: number;
  missing: number;
}
export interface AdguardData {
  queries: number;
  blocked: number;
  blockedPct: number;
}
export interface ProwlarrData {
  indexers: number;
  enabled: number;
  grabs: number;
  queries: number;
}

export interface OverseerrData {
  pending: number;
  processing: number;
  available: number;
}

export interface PlexData {
  streams: number;
  libraries: number;
}

export interface Identity {
  user: string;
}

export interface MeResponse {
  user: string | null;
  required: boolean;
  logoutUrl: string | null;
}

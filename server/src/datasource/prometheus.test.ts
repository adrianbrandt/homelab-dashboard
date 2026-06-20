import { describe, it, expect } from 'vitest';
import { PrometheusDataSource, buildMetrics, type PromVector, type QueryFn, type QueryRangeFn, type PromMatrix } from './prometheus.ts';
import { DEFAULT_THRESHOLDS, windowToRange } from '@dashboard/shared';

const hosts = [
  { id: 'homelab', label: 'homelab' },
  { id: 'kvm4', label: 'kvm4' },
  { id: 'acer', label: 'acer' },
];

const GB = 1024 ** 3;

/** Build a one-series-per-instance vector from { instance: value } pairs. */
function vec(values: Record<string, number>, extraLabels: Record<string, string> = {}): PromVector[] {
  return Object.entries(values).map(([instance, v]) => ({
    metric: { instance, ...extraLabels },
    value: [0, String(v)],
  }));
}

/**
 * Fake query fn keyed by a substring of the PromQL expression. Mirrors a fleet
 * where only `homelab` is scraped (kvm4/acer not yet deployed).
 */
const fakeQuery: QueryFn = async (expr) => {
  if (expr.startsWith('100 -')) return vec({ homelab: 4 });
  if (expr.includes('MemTotal')) return vec({ homelab: 16 * GB });
  if (expr.includes('MemAvailable')) return vec({ homelab: 13 * GB });
  if (expr.includes('node_filesystem_size')) return vec({ homelab: 250 * GB }, { mountpoint: '/' });
  if (expr.includes('node_filesystem_avail')) return vec({ homelab: 216 * GB }, { mountpoint: '/' });
  if (expr.includes('node_hwmon_temp')) return vec({ homelab: 38 });
  if (expr.includes('node_time_seconds')) return vec({ homelab: 1_560_000 });
  if (expr === 'node_load1') return vec({ homelab: 0.73 });
  if (expr === 'node_load5') return vec({ homelab: 0.6 });
  if (expr === 'node_load15') return vec({ homelab: 0.5 });
  if (expr.startsWith('up')) return vec({ homelab: 1 });
  return [];
};

describe('PrometheusDataSource', () => {
  const ds = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { query: fakeQuery });

  it('returns one host per configured host, preserving id/label', async () => {
    const result = await ds.getHosts();
    expect(result.map((h) => h.id)).toEqual(['homelab', 'kvm4', 'acer']);
  });

  it('maps prometheus vectors into HostMetrics for a scraped host', async () => {
    const homelab = (await ds.getHosts()).find((h) => h.id === 'homelab')!;
    expect(homelab.status).toBe('ok');
    expect(homelab.metrics.cpuPercent).toBe(4);
    expect(homelab.metrics.memTotalBytes).toBe(16 * GB);
    expect(homelab.metrics.memUsedBytes).toBe(3 * GB); // total − available
    expect(homelab.metrics.diskTotalBytes).toBe(250 * GB);
    expect(homelab.metrics.diskUsedBytes).toBe(34 * GB); // size − avail
    expect(homelab.metrics.tempC).toBe(38);
    expect(homelab.metrics.uptimeSeconds).toBe(1_560_000);
    expect(homelab.metrics.load).toEqual([0.73, 0.6, 0.5]);
    expect(homelab.metrics.gpu).toBeNull();
  });

  it('marks hosts with no `up` series as down with zeroed metrics', async () => {
    const result = await ds.getHosts();
    const byId = Object.fromEntries(result.map((h) => [h.id, h]));
    for (const id of ['kvm4', 'acer']) {
      expect(byId[id].status).toBe('down');
      expect(byId[id].metrics.memTotalBytes).toBe(0);
      expect(byId[id].metrics.cpuPercent).toBe(0);
      expect(byId[id].metrics.tempC).toBeNull();
    }
  });

  it('survives a query that throws (degrades that metric, not the fleet)', async () => {
    const flaky: QueryFn = async (expr) => {
      if (expr.includes('node_hwmon_temp')) throw new Error('boom');
      return fakeQuery(expr);
    };
    const dsFlaky = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { query: flaky });
    const homelab = (await dsFlaky.getHosts()).find((h) => h.id === 'homelab')!;
    expect(homelab.metrics.tempC).toBeNull(); // temp query failed → null
    expect(homelab.metrics.cpuPercent).toBe(4); // other metrics intact
  });
});

describe('PrometheusDataSource.getHostDetail', () => {
  const detailQuery: QueryFn = async (expr) => {
    if (expr.includes('node_cpu_seconds_total')) {
      return [
        { metric: { instance: 'homelab', cpu: '0' }, value: [0, '12'] },
        { metric: { instance: 'homelab', cpu: '1' }, value: [0, '8'] },
      ];
    }
    if (expr.includes('node_filesystem_size')) return [{ metric: { instance: 'homelab', mountpoint: '/' }, value: [0, String(250 * GB)] }];
    if (expr.includes('node_filesystem_avail')) return [{ metric: { instance: 'homelab', mountpoint: '/' }, value: [0, String(216 * GB)] }];
    if (expr.includes('node_hwmon_temp')) return [{ metric: { instance: 'homelab', sensor: 'temp1' }, value: [0, '44'] }];
    if (expr.includes('node_network_receive')) return [{ metric: { instance: 'homelab', device: 'eth0' }, value: [0, '2000000'] }];
    if (expr.includes('node_network_transmit')) return [{ metric: { instance: 'homelab', device: 'eth0' }, value: [0, '400000'] }];
    if (expr.includes('node_boot_time')) return [{ metric: { instance: 'homelab' }, value: [0, '1000'] }];
    if (expr.includes('node_uname_info')) return [{ metric: { instance: 'homelab', release: '6.8.0-homelab' }, value: [0, '1'] }];
    if (expr.includes('node_os_info')) return [{ metric: { instance: 'homelab', pretty_name: 'Ubuntu 26.04' }, value: [0, '1'] }];
    return [];
  };
  const ds = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { query: detailQuery });

  it('returns null for an unknown host id', async () => {
    expect(await ds.getHostDetail('nope')).toBeNull();
  });

  it('maps instant queries into HostDetail', async () => {
    const d = (await ds.getHostDetail('homelab'))!;
    expect(d.cpuCores).toEqual([12, 8]);
    expect(d.filesystems).toEqual([{ mountpoint: '/', usedBytes: 34 * GB, totalBytes: 250 * GB }]);
    expect(d.temps).toEqual([{ label: 'temp1', celsius: 44 }]);
    expect(d.network).toEqual([{ device: 'eth0', rxBytesPerSec: 2000000, txBytesPerSec: 400000 }]);
    expect(d.bootTime).toBe(1000);
    expect(d.kernel).toBe('6.8.0-homelab');
    expect(d.os).toBe('Ubuntu 26.04');
  });

  it('degrades a failed sub-query to an empty field', async () => {
    const flaky: QueryFn = async (expr) => {
      if (expr.includes('node_hwmon_temp')) throw new Error('boom');
      return detailQuery(expr);
    };
    const d = (await new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { query: flaky }).getHostDetail('homelab'))!;
    expect(d.temps).toEqual([]);
    expect(d.cpuCores).toEqual([12, 8]);
  });
});

describe('PrometheusDataSource.getHostSeries', () => {
  const rangeFn: QueryRangeFn = async (expr, start, end) => {
    // emit two points so the shape is observable; value encodes the metric
    const v = expr.includes('idle') ? '15' : expr.includes('MemAvailable') ? '0.5' : '1';
    return [{ metric: { instance: 'homelab' }, values: [[start, v], [end, v]] }] as PromMatrix[];
  };

  it('returns a point series per metric with the window step', async () => {
    const ds = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { queryRange: rangeFn });
    const s = await ds.getHostSeries('homelab', '6h');
    expect(s.window).toBe('6h');
    expect(s.stepSeconds).toBe(windowToRange('6h').stepSeconds);
    expect(Object.keys(s.metrics).sort()).toEqual(['cpu', 'disk', 'load', 'netRx', 'netTx', 'ram', 'temp']);
    expect(s.metrics.cpu).toHaveLength(2);
    expect(s.metrics.cpu[0].v).toBe(15);
    expect(typeof s.metrics.cpu[0].t).toBe('number');
  });

  it('degrades a failed range query to an empty series', async () => {
    const flaky: QueryRangeFn = async (expr, s, e, st) => {
      if (expr.includes('hwmon')) throw new Error('boom');
      return rangeFn(expr, s, e, st);
    };
    const ds = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { queryRange: flaky });
    const s = await ds.getHostSeries('homelab', '1h');
    expect(s.metrics.temp).toEqual([]);
    expect(s.metrics.cpu.length).toBeGreaterThan(0);
  });

  it('maps NaN range values to null gaps', async () => {
    const withGap: QueryRangeFn = async () => [{ metric: { instance: 'homelab' }, values: [[1000, 'NaN'], [1030, '5']] }] as PromMatrix[];
    const ds = new PrometheusDataSource(hosts, DEFAULT_THRESHOLDS, { queryRange: withGap });
    const s = await ds.getHostSeries('homelab', '1h');
    expect(s.metrics.cpu[0]).toEqual({ t: 1000, v: null });
    expect(s.metrics.cpu[1]).toEqual({ t: 1030, v: 5 });
  });
});

describe('PrometheusDataSource storage host', () => {
  const storageHosts = [
    { id: 'nas', label: 'nas', kind: 'storage' as const, source: { instance: 'homelab', mountpoint: '/mnt/nas-media' } },
  ];
  const storageQuery: QueryFn = async (expr) => {
    if (expr.includes('node_filesystem_size') && expr.includes('/mnt/nas-media'))
      return vec({ homelab: 2000 * GB }, { mountpoint: '/mnt/nas-media' });
    if (expr.includes('node_filesystem_avail') && expr.includes('/mnt/nas-media'))
      return vec({ homelab: 1920 * GB }, { mountpoint: '/mnt/nas-media' });
    return [];
  };

  it('fills disk from the source filesystem and marks reachable', async () => {
    const ds = new PrometheusDataSource(storageHosts, DEFAULT_THRESHOLDS, { query: storageQuery });
    const [nas] = await ds.getHosts();
    expect(nas.kind).toBe('storage');
    expect(nas.status).not.toBe('down');
    expect(nas.metrics.diskTotalBytes).toBe(2000 * GB);
    expect(nas.metrics.diskUsedBytes).toBe(80 * GB);
    expect(nas.metrics.cpuPercent).toBe(0);
    expect(nas.metrics.tempC).toBeNull();
  });

  it('marks a storage host down when its filesystem series is missing', async () => {
    const ds = new PrometheusDataSource(storageHosts, DEFAULT_THRESHOLDS, { query: async () => [] });
    const [nas] = await ds.getHosts();
    expect(nas.status).toBe('down');
    expect(nas.metrics.diskTotalBytes).toBe(0);
  });

  it('has no detail page for a storage host', async () => {
    const ds = new PrometheusDataSource(storageHosts, DEFAULT_THRESHOLDS, { query: storageQuery });
    expect(await ds.getHostDetail('nas')).toBeNull();
  });
});

describe('PrometheusDataSource.getContainers', () => {
  // Helper: a cAdvisor-shaped vector keyed by container name.
  function cvec(values: Record<string, number>, extra: Record<string, string> = {}): PromVector[] {
    return Object.entries(values).map(([name, v]) => ({ metric: { name, ...extra }, value: [0, String(v)] }));
  }
  const SENTINEL = 9223372036854771712; // cAdvisor "unlimited" memory limit
  const cadvisorQuery: QueryFn = async (expr) => {
    if (expr.includes('node_cpu_seconds_total')) return vec({ homelab: 4 }); // count query → 4 cores
    if (expr.includes('container_cpu_usage_seconds_total'))
      return cvec({ grafana: 50, caddy: 25 }, { image: 'grafana/grafana:11' }); // %-of-one-core before /cores
    if (expr.includes('container_memory_working_set_bytes')) return cvec({ grafana: 180_000_000, caddy: 40_000_000 });
    if (expr.includes('container_spec_memory_limit_bytes')) return cvec({ grafana: SENTINEL, caddy: 134_217_728 });
    if (expr.includes('container_start_time_seconds')) return cvec({ grafana: 1000, caddy: 2000 });
    return [];
  };

  it('joins cAdvisor series by name, normalizes CPU by core count, sorts CPU desc', async () => {
    const ds = new PrometheusDataSource([], DEFAULT_THRESHOLDS, { query: cadvisorQuery });
    const { containers } = await ds.getContainers();
    expect(containers.map((c) => c.name)).toEqual(['grafana', 'caddy']); // 50→12.5%, 25→6.25%
    expect(containers[0].cpuPercent).toBeCloseTo(12.5, 1); // 50 / 4 cores
    expect(containers[0].memUsedBytes).toBe(180_000_000);
  });

  it('normalizes the unlimited-memory sentinel to 0', async () => {
    const ds = new PrometheusDataSource([], DEFAULT_THRESHOLDS, { query: cadvisorQuery });
    const { containers } = await ds.getContainers();
    const grafana = containers.find((c) => c.name === 'grafana')!;
    const caddy = containers.find((c) => c.name === 'caddy')!;
    expect(grafana.memLimitBytes).toBe(0); // sentinel → unlimited
    expect(caddy.memLimitBytes).toBe(134_217_728); // real limit kept
  });
});

describe('buildMetrics', () => {
  it('treats a missing temp series as null, not zero', () => {
    const maps = {
      cpu: {},
      memTotal: {},
      memAvail: {},
      diskTotal: {},
      diskAvail: {},
      temp: {},
      uptime: {},
      load1: {},
      load5: {},
      load15: {},
      up: {},
    };
    expect(buildMetrics('homelab', maps).tempC).toBeNull();
  });

  it('never reports negative used bytes when avail exceeds total briefly', () => {
    const base = {
      cpu: {},
      memTotal: { h: 100 },
      memAvail: { h: 120 },
      diskTotal: {},
      diskAvail: {},
      temp: {},
      uptime: {},
      load1: {},
      load5: {},
      load15: {},
      up: {},
    };
    expect(buildMetrics('h', base).memUsedBytes).toBe(0);
  });
});

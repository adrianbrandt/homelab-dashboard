import { describe, it, expect } from 'vitest';
import { windowToRange, SERIES_WINDOWS, summarizeFleet, type Host } from './index.ts';

const GB = 1024 ** 3;
function host(id: string, status: Host['status'], cpu: number, memUsed: number, memTotal: number, diskUsed: number, diskTotal: number): Host {
  return {
    id, label: id, status, links: [],
    metrics: { cpuPercent: cpu, memUsedBytes: memUsed, memTotalBytes: memTotal, diskUsedBytes: diskUsed, diskTotalBytes: diskTotal, tempC: 40, uptimeSeconds: 1000, load: [0, 0, 0], gpu: null },
    lastUpdated: 'now',
  };
}

describe('windowToRange', () => {
  it('maps each window to a range/step', () => {
    expect(windowToRange('1h')).toEqual({ rangeSeconds: 3600, stepSeconds: 30 });
    expect(windowToRange('6h')).toEqual({ rangeSeconds: 21600, stepSeconds: 300 });
    expect(windowToRange('24h')).toEqual({ rangeSeconds: 86400, stepSeconds: 900 });
  });
  it('falls back to 6h for an unknown window', () => {
    expect(windowToRange('99h' as never)).toEqual(windowToRange('6h'));
  });
  it('SERIES_WINDOWS lists the three windows', () => {
    expect(SERIES_WINDOWS).toEqual(['1h', '6h', '24h']);
  });
});

describe('summarizeFleet', () => {
  it('counts up hosts and sums only up hosts', () => {
    const hosts = [
      host('a', 'ok', 10, 2 * GB, 8 * GB, 1 * GB, 10 * GB),
      host('b', 'warn', 30, 4 * GB, 8 * GB, 5 * GB, 10 * GB),
      host('c', 'down', 0, 0, 0, 0, 0),
    ];
    const s = summarizeFleet(hosts);
    expect(s.total).toBe(3);
    expect(s.up).toBe(2);
    expect(s.cpuPercent).toBe(20); // avg of 10 and 30
    expect(s.memUsedBytes).toBe(6 * GB);
    expect(s.memTotalBytes).toBe(16 * GB);
    expect(s.diskUsedBytes).toBe(6 * GB);
  });
  it('reports zero cpu with no up hosts', () => {
    expect(summarizeFleet([host('c', 'down', 0, 0, 0, 0, 0)]).cpuPercent).toBe(0);
  });
});

const GB2 = 1024 ** 3;
function host2(over: Partial<Host>): Host {
  return {
    id: 'h', label: 'h', status: 'ok', links: [], lastUpdated: 'now',
    metrics: {
      cpuPercent: 10, memUsedBytes: 1 * GB2, memTotalBytes: 4 * GB2,
      diskUsedBytes: 1 * GB2, diskTotalBytes: 10 * GB2,
      tempC: 40, uptimeSeconds: 100, load: [0, 0, 0], gpu: null,
    },
    ...over,
  };
}

import type { WidgetResult, SonarrData, RadarrData, AdguardData } from './index.ts';

describe('widget result + data types', () => {
  it('models a discriminated result and the three data shapes', () => {
    const ok: WidgetResult<SonarrData> = { ok: true, data: { queue: 1, series: 2, upcoming: 3 } };
    const err: WidgetResult = { ok: false, error: 'boom' };
    const r: RadarrData = { queue: 0, movies: 9, missing: 4 };
    const a: AdguardData = { queries: 100, blocked: 18, blockedPct: 18 };
    expect(ok.ok && ok.data.series).toBe(2);
    expect(err.ok).toBe(false);
    expect(r.movies + a.blocked).toBe(27);
  });
});

describe('summarizeFleet storage exclusion', () => {
  it('ignores storage hosts in totals, averages, and counts', () => {
    const compute = host2({ id: 'homelab', metrics: { ...host2({}).metrics, cpuPercent: 20 } });
    const nas = host2({ id: 'nas', kind: 'storage', metrics: { ...host2({}).metrics, cpuPercent: 0, memTotalBytes: 0, memUsedBytes: 0, diskTotalBytes: 2000 * GB2, diskUsedBytes: 80 * GB2 } });
    const t = summarizeFleet([compute, nas]);
    expect(t.total).toBe(1);
    expect(t.up).toBe(1);
    expect(t.cpuPercent).toBe(20); // nas's 0% must not drag the average
    expect(t.diskTotalBytes).toBe(10 * GB2); // nas disk excluded
  });
});

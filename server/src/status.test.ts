import { describe, it, expect } from 'vitest';
import {
  deriveStatus,
  metricStatus,
  pct,
  type HostMetrics,
} from '@dashboard/shared';

const GB = 1024 ** 3;

function metrics(over: Partial<HostMetrics> = {}): HostMetrics {
  return {
    cpuPercent: 5,
    memUsedBytes: 2 * GB,
    memTotalBytes: 16 * GB,
    diskUsedBytes: 20 * GB,
    diskTotalBytes: 200 * GB,
    tempC: 40,
    uptimeSeconds: 1000,
    load: [0.1, 0.1, 0.1],
    ...over,
  };
}

describe('pct', () => {
  it('computes percentage and guards zero total', () => {
    expect(pct(50, 200)).toBe(25);
    expect(pct(5, 0)).toBe(0);
  });
});

describe('metricStatus', () => {
  it('is ok below threshold and warn at/above it', () => {
    expect(metricStatus(79)).toBe('ok');
    expect(metricStatus(80)).toBe('warn');
    expect(metricStatus(95)).toBe('warn');
  });
});

describe('deriveStatus', () => {
  it('is ok when everything is below thresholds', () => {
    expect(deriveStatus(metrics())).toBe('ok');
  });

  it('warns when RAM crosses 80%', () => {
    expect(deriveStatus(metrics({ memUsedBytes: 13 * GB, memTotalBytes: 16 * GB }))).toBe('warn');
  });

  it('warns when disk crosses 80%', () => {
    expect(deriveStatus(metrics({ diskUsedBytes: 170 * GB, diskTotalBytes: 200 * GB }))).toBe('warn');
  });

  it('warns when temperature crosses 80C', () => {
    expect(deriveStatus(metrics({ tempC: 85 }))).toBe('warn');
  });

  it('ignores temperature when null', () => {
    expect(deriveStatus(metrics({ tempC: null }))).toBe('ok');
  });

  it('down overrides metric-based status', () => {
    expect(deriveStatus(metrics({ memUsedBytes: 1 * GB }), undefined, true)).toBe('down');
  });
});

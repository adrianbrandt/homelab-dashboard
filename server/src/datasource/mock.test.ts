import { describe, it, expect } from 'vitest';
import { MockDataSource } from './mock.ts';
import { DEFAULT_THRESHOLDS, windowToRange } from '@dashboard/shared';

const hosts = [
  { id: 'homelab', label: 'homelab' },
  { id: 'kvm4', label: 'kvm4' },
  { id: 'acer', label: 'acer' },
  { id: 'nas', label: 'nas', kind: 'storage' as const, source: { instance: 'homelab', mountpoint: '/mnt/nas-media' } },
];

describe('MockDataSource', () => {
  const ds = new MockDataSource(hosts, DEFAULT_THRESHOLDS);

  it('returns one host per configured host, preserving id/label', async () => {
    const result = await ds.getHosts();
    expect(result.map((h) => h.id)).toEqual(['homelab', 'kvm4', 'acer', 'nas']);
  });

  it('produces in-bounds metrics with a valid status', async () => {
    for (const h of await ds.getHosts()) {
      expect(h.metrics.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(h.metrics.cpuPercent).toBeLessThanOrEqual(100);
      expect(h.metrics.memUsedBytes).toBeLessThanOrEqual(h.metrics.memTotalBytes);
      expect(h.metrics.diskUsedBytes).toBeLessThanOrEqual(h.metrics.diskTotalBytes);
      expect(['ok', 'warn', 'down']).toContain(h.status);
      expect(typeof h.lastUpdated).toBe('string');
    }
  });

  it('only the acer carries GPU metrics', async () => {
    const result = await ds.getHosts();
    const byId = Object.fromEntries(result.map((h) => [h.id, h]));
    expect(byId.acer.metrics.gpu).toBeTruthy();
    expect(byId.homelab.metrics.gpu ?? null).toBeNull();
    expect(byId.kvm4.metrics.gpu ?? null).toBeNull();
  });

  it('jitters values between calls', async () => {
    const a = await ds.getHosts();
    const b = await ds.getHosts();
    // At least one CPU value should differ across polls (jitter is live).
    const changed = a.some((h, i) => h.metrics.cpuPercent !== b[i].metrics.cpuPercent);
    expect(changed).toBe(true);
  });
});

describe('MockDataSource detail + series', () => {
  const hosts = [
    { id: 'homelab', label: 'homelab' },
    { id: 'kvm4', label: 'kvm4' },
  ];
  const ds = new MockDataSource(hosts, DEFAULT_THRESHOLDS);

  it('returns null detail for an unknown host', async () => {
    expect(await ds.getHostDetail('nope')).toBeNull();
  });

  it('returns plausible detail for a known host', async () => {
    const d = (await ds.getHostDetail('homelab'))!;
    expect(d.id).toBe('homelab');
    expect(d.cpuCores.length).toBeGreaterThan(0);
    expect(d.filesystems.some((f) => f.mountpoint === '/')).toBe(true);
    expect(d.bootTime).toBeGreaterThan(0);
    expect(d.kernel).toBeTruthy();
  });

  it('series has all seven metrics with the right point count and is deterministic', async () => {
    const a = await ds.getHostSeries('homelab', '1h');
    const b = await ds.getHostSeries('homelab', '1h');
    const { rangeSeconds, stepSeconds } = windowToRange('1h');
    expect(a.stepSeconds).toBe(stepSeconds);
    expect(Object.keys(a.metrics)).toHaveLength(7);
    expect(a.metrics.cpu).toHaveLength(Math.floor(rangeSeconds / stepSeconds));
    expect(a.metrics.cpu.map((p) => p.v)).toEqual(b.metrics.cpu.map((p) => p.v));
  });
});

describe('MockDataSource.getContainers', () => {
  const ds = new MockDataSource(hosts, DEFAULT_THRESHOLDS);

  it('returns a non-empty list sorted by CPU descending', async () => {
    const { containers, generatedAt } = await ds.getContainers();
    expect(containers.length).toBeGreaterThan(0);
    expect(typeof generatedAt).toBe('string');
    for (let i = 1; i < containers.length; i++) {
      expect(containers[i - 1].cpuPercent).toBeGreaterThanOrEqual(containers[i].cpuPercent);
    }
  });

  it('each row has a name, image, and non-negative memory', async () => {
    for (const c of (await ds.getContainers()).containers) {
      expect(c.name).toBeTruthy();
      expect(c.image).toBeTruthy();
      expect(c.memUsedBytes).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('MockDataSource storage host', () => {
  const ds = new MockDataSource(
    [{ id: 'nas', label: 'nas', kind: 'storage', source: { instance: 'homelab', mountpoint: '/mnt/nas-media' } }],
    DEFAULT_THRESHOLDS,
  );

  it('emits a storage-only host: kind set, disk present, compute metrics zeroed', async () => {
    const [nas] = await ds.getHosts();
    expect(nas.kind).toBe('storage');
    expect(nas.metrics.diskTotalBytes).toBeGreaterThan(0);
    expect(nas.metrics.diskUsedBytes).toBeLessThanOrEqual(nas.metrics.diskTotalBytes);
    expect(nas.metrics.cpuPercent).toBe(0);
    expect(nas.metrics.memTotalBytes).toBe(0);
    expect(nas.metrics.tempC).toBeNull();
  });

  it('has no detail page (getHostDetail returns null)', async () => {
    expect(await ds.getHostDetail('nas')).toBeNull();
  });
});

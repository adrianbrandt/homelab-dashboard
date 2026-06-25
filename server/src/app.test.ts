import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from './app.ts';
import type { DataSource, Host, HostDetail } from '@dashboard/shared';
import { MockDataSource } from './datasource/mock.ts';
import { DEFAULT_THRESHOLDS } from '@dashboard/shared';
import { loadConfig } from './config/load.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

const stubHost: Host = {
  id: 'homelab',
  label: 'homelab',
  status: 'ok',
  links: [],
  metrics: {
    cpuPercent: 4,
    memUsedBytes: 2_000_000_000,
    memTotalBytes: 14_000_000_000,
    diskUsedBytes: 18_000_000_000,
    diskTotalBytes: 233_000_000_000,
    tempC: 42,
    uptimeSeconds: 1000,
    load: [0.04, 0.05, 0.06],
    gpu: null,
  },
  lastUpdated: new Date().toISOString(),
};

const stubDetail: HostDetail = {
  id: 'homelab',
  cpuCores: [12, 8],
  filesystems: [{ mountpoint: '/', usedBytes: 1, totalBytes: 2 }],
  temps: [{ label: 'temp1', celsius: 44 }],
  network: [{ device: 'eth0', rxBytesPerSec: 1, txBytesPerSec: 1 }],
  bootTime: 1000,
  kernel: '6.8.0',
  os: 'Ubuntu 26.04',
};

const mockDataSource: DataSource = {
  getHosts: async () => [stubHost],
  getHostDetail: async (id) => (id === 'homelab' ? stubDetail : null),
  getHostSeries: async (id, window) => ({
    id,
    window,
    stepSeconds: 300,
    metrics: { cpu: [{ t: 1, v: 5 }], ram: [], disk: [], temp: [], load: [], netRx: [], netTx: [] },
  }),
  getContainers: async () => ({
    containers: [{ name: 'grafana', image: 'grafana/grafana:11', cpuPercent: 3, memUsedBytes: 100, memLimitBytes: 0, uptimeSeconds: 500 }],
    generatedAt: new Date().toISOString(),
  }),
};

function stubDataSource() {
  return {
    getHosts: async () => [],
    getHostDetail: async () => null,
    getHostSeries: async () => ({ id: '', window: '6h' as const, stepSeconds: 0, metrics: {} as never }),
    getContainers: async () => ({ containers: [], generatedAt: '' }),
  };
}

describe('api', () => {
  const app = createApp({ dataSource: mockDataSource });

  it('health returns ok with a version', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.version).toBe('string');
  });

  it('hosts returns the shared-typed payload', async () => {
    const res = await request(app).get('/api/hosts');
    expect(res.status).toBe(200);
    expect(res.body.data.hosts).toHaveLength(1);
    expect(res.body.data.hosts[0]).toMatchObject({ id: 'homelab', status: 'ok' });
    expect(typeof res.body.data.generatedAt).toBe('string');
  });

  it('unknown /api route 404s instead of returning the SPA shell', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('host detail returns the detail payload', async () => {
    const res = await request(app).get('/api/hosts/homelab');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'homelab', kernel: '6.8.0' });
  });

  it('unknown host detail 404s', async () => {
    const res = await request(app).get('/api/hosts/ghost');
    expect(res.status).toBe(404);
  });

  it('host series defaults to the 6h window for a bad param', async () => {
    const res = await request(app).get('/api/hosts/homelab/series?window=bogus');
    expect(res.status).toBe(200);
    expect(res.body.data.window).toBe('6h');
  });

  it('host series honours a valid window', async () => {
    const res = await request(app).get('/api/hosts/homelab/series?window=24h');
    expect(res.body.data.window).toBe('24h');
  });

  it('GET /api/containers returns the container list', async () => {
    const app = createApp({ dataSource: mockDataSource });
    const res = await request(app).get('/api/containers');
    expect(res.status).toBe(200);
    expect(res.body.data.containers[0].name).toBe('grafana');
    expect(typeof res.body.data.generatedAt).toBe('string');
  });

  it('serves hosts sourced from the injected appConfig', async () => {
    const appConfig = loadConfig({
      text: `
hosts:
  - id: alpha
    label: Alpha
    source: { type: prometheus, instance: alpha }
`,
    });
    const dataSource = new MockDataSource(appConfig.hosts, DEFAULT_THRESHOLDS);
    const app = createApp({ appConfig, dataSource });
    const res = await request(app).get('/api/hosts');
    expect(res.status).toBe(200);
    expect(res.body.data.hosts.map((h: { id: string }) => h.id)).toEqual(['alpha']);
  });
});

describe('spa fallback', () => {
  const app = createApp({
    dataSource: mockDataSource,
    webDist: path.resolve(here, '../test-fixtures'),
  });

  it('serves index.html for non-api client routes (deep link)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
  });
});

describe('auth /api/me', () => {
  it('reports no user and not-required by default (provider none)', async () => {
    const appConfig = loadConfig({ text: 'hosts: []' });
    const app = createApp({ appConfig, dataSource: stubDataSource() });
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ user: null, required: false, logoutUrl: null });
  });

  it('reports the identity from the configured header (forward-header)', async () => {
    const appConfig = loadConfig({
      text: `
auth:
  provider: forward-header
  preset: cloudflare
  required: true
`,
    });
    const app = createApp({ appConfig, dataSource: stubDataSource() });
    const res = await request(app)
      .get('/api/me')
      .set('Cf-Access-Authenticated-User-Email', 'me@example.com');
    expect(res.body.data).toEqual({
      user: 'me@example.com',
      required: true,
      logoutUrl: '/cdn-cgi/access/logout',
    });
  });

  it('reports null user but required:true when the header is absent', async () => {
    const appConfig = loadConfig({
      text: `
auth:
  provider: forward-header
  preset: cloudflare
  required: true
`,
    });
    const app = createApp({ appConfig, dataSource: stubDataSource() });
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeNull();
    expect(res.body.data.required).toBe(true);
  });
});

describe('auth enforcement (required: true)', () => {
  const text = `
auth:
  provider: forward-header
  preset: custom
  header: X-Test-User
  required: true
groups:
  - name: Media
    widgets:
      - type: bookmarks
        items:
          - { label: Sonarr, url: https://sonarr }
`;
  const build = () => createApp({ appConfig: loadConfig({ text }), dataSource: mockDataSource });

  it('401s a data route without identity', async () => {
    const res = await request(build()).get('/api/hosts');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthenticated' });
  });

  it('401s param routes without identity', async () => {
    expect((await request(build()).get('/api/widget/0-0')).status).toBe(401);
    expect((await request(build()).get('/api/hosts/homelab/series?window=1h')).status).toBe(401);
  });

  it('allows data routes with a valid identity header', async () => {
    const res = await request(build()).get('/api/hosts').set('X-Test-User', 'me@example.com');
    expect(res.status).toBe(200);
    expect(res.body.data.hosts).toHaveLength(1);
  });

  it('keeps /api/health and /api/me open without identity', async () => {
    expect((await request(build()).get('/api/health')).status).toBe(200);
    expect((await request(build()).get('/api/me')).status).toBe(200);
  });

  it('still serves the SPA shell without identity', async () => {
    const app = createApp({
      appConfig: loadConfig({ text }),
      dataSource: mockDataSource,
      webDist: path.resolve(here, '../test-fixtures'),
    });
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!doctype html>');
  });
});

describe('widget endpoints', () => {
  const text = `
settings:
  title: Test Lab
groups:
  - name: Media
    widgets:
      - type: bookmarks
        items:
          - { label: Sonarr, url: https://sonarr }
`;

  it('GET /api/layout returns settings + groups with ids and types', async () => {
    const appConfig = loadConfig({ text });
    const res = await request(createApp({ appConfig, dataSource: stubDataSource() })).get('/api/layout');
    expect(res.status).toBe(200);
    expect(res.body.data.settings.title).toBe('Test Lab');
    expect(res.body.data.settings.theme).toEqual({ mode: 'dark', density: 'comfortable' });
    expect(res.body.data.groups).toEqual([
      { name: 'Media', widgets: [{ id: '0-0', type: 'bookmarks' }] },
    ]);
  });

  it('GET /api/widget/:id returns a wrapped ok result', async () => {
    const appConfig = loadConfig({ text });
    const res = await request(createApp({ appConfig, dataSource: stubDataSource() })).get('/api/widget/0-0');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { items: [{ label: 'Sonarr', url: 'https://sonarr' }] } });
  });

  it('GET /api/widget/:id 404s on an unknown id', async () => {
    const appConfig = loadConfig({ text });
    const res = await request(createApp({ appConfig, dataSource: stubDataSource() })).get('/api/widget/nope');
    expect(res.status).toBe(404);
  });
});

import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { parseConfig, loadConfig, interpolateEnv, ConfigError } from './load.ts';
import { validateLayout } from '../widgets/index.ts';

describe('config loader', () => {
  afterEach(() => {
    delete process.env.DASH_TITLE;
    delete process.env.SONARR_KEY;
    delete process.env.RADARR_KEY;
    delete process.env.ADGUARD_PASS;
    delete process.env.PROWLARR_KEY;
    delete process.env.OVERSEERR_KEY;
    delete process.env.PLEX_TOKEN;
    delete process.env.QBIT_PASS;
  });

  it('defaults the theme block when omitted', () => {
    const cfg = parseConfig('settings:\n  title: Lab\n');
    expect(cfg.settings.theme).toEqual({ mode: 'dark', density: 'comfortable' });
  });

  it('parses an explicit theme block', () => {
    const cfg = parseConfig(`
settings:
  title: Lab
  theme:
    mode: light
    density: compact
    accent: "#e0a575"
`);
    expect(cfg.settings.theme).toEqual({ mode: 'light', density: 'compact', accent: '#e0a575' });
  });

  it('rejects an invalid theme mode', () => {
    expect(() => parseConfig('settings:\n  theme:\n    mode: neon\n')).toThrow(ConfigError);
  });

  it('parses a valid config with defaults', () => {
    const cfg = parseConfig(`
hosts:
  - id: homelab
    label: homelab
    source: { type: prometheus, instance: homelab }
groups:
  - name: Media
    widgets:
      - type: bookmarks
        items:
          - { label: Sonarr, url: https://sonarr }
`);
    expect(cfg.settings.title).toBe('Homelab'); // default applied
    expect(cfg.hosts[0].id).toBe('homelab');
    expect(cfg.hosts[0].links).toEqual([]); // default applied
    expect(cfg.groups[0].widgets[0].type).toBe('bookmarks');
  });

  it('throws a friendly error on invalid config', () => {
    expect(() => parseConfig('hosts:\n  - label: nope\n')).toThrow(ConfigError);
    expect(() => parseConfig('hosts:\n  - label: nope\n')).toThrow(/hosts\.0\.id/);
  });

  it('interpolates {{ENV}} tokens', () => {
    process.env.DASH_TITLE = 'My Lab';
    const cfg = parseConfig('settings:\n  title: "{{DASH_TITLE}}"\n');
    expect(cfg.settings.title).toBe('My Lab');
  });

  it('throws on a missing env var', () => {
    expect(() => interpolateEnv('x: {{DEFINITELY_MISSING}}')).toThrow(/DEFINITELY_MISSING/);
  });

  it('throws ConfigError when a storage host omits mountpoint', () => {
    expect(() =>
      parseConfig(`
hosts:
  - id: nas
    label: NAS
    kind: storage
    source: { type: prometheus, instance: homelab }
`),
    ).toThrow(ConfigError);
    expect(() =>
      parseConfig(`
hosts:
  - id: nas
    label: NAS
    kind: storage
    source: { type: prometheus, instance: homelab }
`),
    ).toThrow(/mountpoint/);
  });

  it('parses a valid storage host with mountpoint', () => {
    const cfg = parseConfig(`
hosts:
  - id: nas
    label: NAS
    kind: storage
    source: { type: prometheus, instance: homelab, mountpoint: /mnt/nas-media }
`);
    expect(cfg.hosts[0].kind).toBe('storage');
    expect(cfg.hosts[0].source.mountpoint).toBe('/mnt/nas-media');
  });

  it('returns an empty default config when the file is absent', () => {
    const cfg = loadConfig({ path: '/no/such/config.yaml' });
    expect(cfg.hosts).toEqual([]);
    expect(cfg.groups).toEqual([]);
    expect(cfg.settings.title).toBe('Homelab');
  });

  it('loads and validates the committed config.example.yaml', () => {
    process.env.SONARR_KEY = 'x';
    process.env.RADARR_KEY = 'y';
    process.env.ADGUARD_PASS = 'z';
    process.env.PROWLARR_KEY = 'p';
    process.env.OVERSEERR_KEY = 'o';
    process.env.PLEX_TOKEN = 't';
    process.env.QBIT_PASS = 'q';
    const examplePath = path.join(import.meta.dirname, '../../../config.example.yaml');
    const cfg = loadConfig({ path: examplePath });
    expect(() => validateLayout(cfg)).not.toThrow();
    expect(cfg.groups.flatMap((g) => g.widgets.map((w) => w.type))).toContain('sonarr');
  });
});

import { describe, it, expect } from 'vitest';
import { getWidget, validateLayout } from './index.ts';
import { bookmarks } from './bookmarks.ts';
import { widgetInstances } from './instances.ts';
import { loadConfig } from '../config/load.ts';

describe('widget registry', () => {
  it('resolves a registered widget by type', () => {
    expect(getWidget('bookmarks')).toBe(bookmarks);
    expect(getWidget('nope')).toBeUndefined();
  });

  it('bookmarks.fetch returns its items', async () => {
    const data = await bookmarks.fetch({ items: [{ label: 'A', url: 'https://a' }] });
    expect(data).toEqual({ items: [{ label: 'A', url: 'https://a' }] });
  });

  it('bookmarks.configSchema rejects bad config', () => {
    expect(bookmarks.configSchema.safeParse({ items: [{ label: 'A' }] }).success).toBe(false);
  });

  it('validateLayout throws on an unknown widget type', () => {
    const cfg = loadConfig({ text: 'groups:\n  - name: G\n    widgets:\n      - type: ghost\n' });
    expect(() => validateLayout(cfg)).toThrow(/ghost/);
  });

  it('resolves the M2.4 service widgets', () => {
    for (const t of ['prowlarr', 'overseerr', 'plex', 'qbittorrent']) {
      expect(getWidget(t)?.type).toBe(t);
    }
  });

  it('widgetInstances derives ids from position when none given', () => {
    const cfg = loadConfig({
      text: `
groups:
  - name: G
    widgets:
      - type: bookmarks
        items: []
      - id: custom
        type: bookmarks
        items: []
`,
    });
    expect(widgetInstances(cfg).map((w) => w.id)).toEqual(['0-0', 'custom']);
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.ts';
import { loadConfig } from './config/load.ts';
import { CfAccessJwtProvider } from './auth/cf-access-jwt.ts';
import type { JWTVerifyGetKey } from 'jose';
import type { DataSource } from '@dashboard/shared';

function stubDataSource(): DataSource {
  return {
    getHosts: async () => [],
    getHostDetail: async () => null,
    getHostSeries: async () => ({ id: '', window: '6h', stepSeconds: 0, metrics: {} as never }),
    getContainers: async () => ({ containers: [], generatedAt: '' }),
  };
}

describe('secret non-leakage', () => {
  const canary = 'SECRET-CANARY-DO-NOT-LEAK';

  it('never echoes a resolved {{ENV}} secret in /api/layout or /api/widget', async () => {
    process.env.SECRET_CANARY = canary;
    try {
      const appConfig = loadConfig({
        text: `
groups:
  - name: Media
    widgets:
      - type: sonarr
        url: http://127.0.0.1:1
        key: {{SECRET_CANARY}}
`,
      });
      const app = createApp({ appConfig, dataSource: stubDataSource() });

      const layout = await request(app).get('/api/layout');
      expect(layout.status).toBe(200);
      expect(JSON.stringify(layout.body)).not.toContain(canary);

      const widget = await request(app).get('/api/widget/0-0');
      expect(widget.status).not.toBe(404); // the widget id resolved — not a vacuous pass
      expect(JSON.stringify(widget.body)).not.toContain(canary);
      expect(widget.body.ok).toBe(false); // fetch failed (conn refused), still no leak
    } finally {
      delete process.env.SECRET_CANARY;
    }
  });

  it('exposes identity only in /api/me, never in /api/layout', async () => {
    const appConfig = loadConfig({
      text: `
auth:
  provider: forward-header
  preset: custom
  header: X-Test-User
groups:
  - name: Media
    widgets:
      - type: bookmarks
        items:
          - { label: Sonarr, url: https://sonarr }
`,
    });
    const app = createApp({ appConfig, dataSource: stubDataSource() });
    const email = 'leaktest@example.com';

    const me = await request(app).get('/api/me').set('X-Test-User', email);
    expect(me.body.data.user).toBe(email); // expected here

    const layout = await request(app).get('/api/layout').set('X-Test-User', email);
    expect(layout.status).toBe(200);
    expect(JSON.stringify(layout.body)).not.toContain(email); // never here
  });

  it('never echoes the raw Cf-Access-Jwt-Assertion header in /api/layout', async () => {
    const appConfig = loadConfig({
      text: `
auth:
  provider: cf-access-jwt
  teamDomain: team.cloudflareaccess.com
  aud: aud-tag
groups:
  - name: Media
    widgets:
      - type: bookmarks
        items:
          - { label: Sonarr, url: https://sonarr }
`,
    });
    // Inject a JWKS getter that throws so verification fails offline (no network, no leak risk).
    const throwing = (() => {
      throw new Error('no network in test');
    }) as unknown as JWTVerifyGetKey;
    const authProvider = new CfAccessJwtProvider({
      issuer: 'https://team.cloudflareaccess.com',
      aud: ['aud-tag'],
      jwks: throwing,
    });
    const app = createApp({ appConfig, dataSource: stubDataSource(), authProvider });
    const jwtCanary = 'JWT-CANARY-token.value.signature';

    const layout = await request(app).get('/api/layout').set('Cf-Access-Jwt-Assertion', jwtCanary);
    expect(layout.status).toBe(200);
    expect(JSON.stringify(layout.body)).not.toContain(jwtCanary);
  });
});

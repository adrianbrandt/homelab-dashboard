import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  createLocalJWKSet,
  type JWTVerifyGetKey,
  type JWK,
} from 'jose';
import { createApp } from '../app.ts';
import { loadConfig } from '../config/load.ts';
import { CfAccessJwtProvider } from './cf-access-jwt.ts';
import type { DataSource } from '@dashboard/shared';

const ISSUER = 'https://team.cloudflareaccess.com';
const AUD = 'aud-tag';

function stubDataSource(): DataSource {
  return {
    getHosts: async () => [],
    getHostDetail: async () => null,
    getHostSeries: async () => ({ id: '', window: '6h', stepSeconds: 0, metrics: {} as never }),
    getContainers: async () => ({ containers: [], generatedAt: '' }),
  };
}

let privateKey: CryptoKey;
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk: JWK = await exportJWK(pair.publicKey);
  jwk.kid = 'test-key';
  jwk.alg = 'RS256';
  jwks = createLocalJWKSet({ keys: [jwk] });
});

async function token(email = 'a@b.com'): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(ISSUER)
    .setAudience(AUD)
    .setExpirationTime('2h')
    .sign(privateKey);
}

function app() {
  const appConfig = loadConfig({
    text: `
auth:
  provider: cf-access-jwt
  teamDomain: team.cloudflareaccess.com
  aud: aud-tag
  required: true
`,
  });
  const authProvider = new CfAccessJwtProvider({ issuer: ISSUER, aud: [AUD], jwks });
  return createApp({ appConfig, dataSource: stubDataSource(), authProvider });
}

describe('cf-access-jwt enforcement (required)', () => {
  it('401s a data route without a token', async () => {
    const res = await request(app()).get('/api/hosts');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthenticated' });
  });

  it('200s a data route with a valid token', async () => {
    const res = await request(app()).get('/api/hosts').set('Cf-Access-Jwt-Assertion', await token());
    expect(res.status).toBe(200);
  });

  it('keeps /api/health and /api/me open without a token', async () => {
    const health = await request(app()).get('/api/health');
    expect(health.status).toBe(200);
    const me = await request(app()).get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user).toBeNull();
    expect(me.body.data.required).toBe(true);
    expect(me.body.data.logoutUrl).toBe('/cdn-cgi/access/logout');
  });

  it('reports the email through /api/me with a valid token', async () => {
    const me = await request(app()).get('/api/me').set('Cf-Access-Jwt-Assertion', await token('me@x.com'));
    expect(me.body.data.user).toBe('me@x.com');
  });
});

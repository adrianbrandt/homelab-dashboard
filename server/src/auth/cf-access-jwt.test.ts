import { describe, it, expect, beforeAll } from 'vitest';
import type express from 'express';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  createLocalJWKSet,
  type JWTVerifyGetKey,
  type JWK,
} from 'jose';
import { CfAccessJwtProvider } from './cf-access-jwt.ts';

const ISSUER = 'https://team.cloudflareaccess.com';
const AUD = 'aud-tag';

function fakeReq(headers: Record<string, string | string[]>): express.Request {
  return { headers, socket: { remoteAddress: '10.0.0.1' } } as unknown as express.Request;
}

let privateKey: CryptoKey;
let jwks: JWTVerifyGetKey;
let foreignKey: CryptoKey;

// Absolute epoch (seconds) one hour in the past — robust expired token.
const PAST_EPOCH = Math.floor(Date.now() / 1000) - 3600;

async function sign(
  claims: Record<string, unknown>,
  opts: { issuer?: string; aud?: string; exp?: string | number; key?: CryptoKey } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '2h')
    .sign(opts.key ?? privateKey);
}

function provider(aud: string[] = [AUD], set: JWTVerifyGetKey = jwks): CfAccessJwtProvider {
  return new CfAccessJwtProvider({ issuer: ISSUER, aud, jwks: set });
}

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk: JWK = await exportJWK(pair.publicKey);
  jwk.kid = 'test-key';
  jwk.alg = 'RS256';
  jwks = createLocalJWKSet({ keys: [jwk] });
  foreignKey = (await generateKeyPair('RS256')).privateKey;
});

describe('CfAccessJwtProvider', () => {
  it('resolves the email claim from a valid token', async () => {
    const token = await sign({ email: 'a@b.com' });
    const id = await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }));
    expect(id).toEqual({ user: 'a@b.com' });
  });

  it('returns null when the header is missing', async () => {
    expect(await provider().resolve(fakeReq({}))).toBeNull();
  });

  it('returns null for a duplicate (array) header', async () => {
    const token = await sign({ email: 'a@b.com' });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': [token, token] }))).toBeNull();
  });

  it('returns null for the wrong audience', async () => {
    const token = await sign({ email: 'a@b.com' }, { aud: 'other-aud' });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });

  it('returns null for the wrong issuer', async () => {
    const token = await sign({ email: 'a@b.com' }, { issuer: 'https://evil.cloudflareaccess.com' });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const token = await sign({ email: 'a@b.com' }, { exp: PAST_EPOCH });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });

  it('returns null for a signature from a foreign key', async () => {
    const token = await sign({ email: 'a@b.com' }, { key: foreignKey });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });

  it('returns null when the token has no email claim', async () => {
    const token = await sign({ sub: 'service-token' });
    expect(await provider().resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });

  it('matches when aud is one of several configured tags', async () => {
    const token = await sign({ email: 'a@b.com' }, { aud: 'second' });
    const id = await provider(['first', 'second']).resolve(fakeReq({ 'cf-access-jwt-assertion': token }));
    expect(id).toEqual({ user: 'a@b.com' });
  });

  it('fails closed when the JWKS getter throws (unreachable)', async () => {
    const throwing = (() => {
      throw new Error('JWKS unreachable');
    }) as unknown as JWTVerifyGetKey;
    const token = await sign({ email: 'a@b.com' });
    expect(await provider([AUD], throwing).resolve(fakeReq({ 'cf-access-jwt-assertion': token }))).toBeNull();
  });
});

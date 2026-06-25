import { describe, it, expect } from 'vitest';
import { appConfigSchema } from '../config/schema.ts';
import { resolveAuth } from './presets.ts';

const parseAuth = (auth: unknown) => appConfigSchema.parse({ auth }).auth;

describe('resolveAuth', () => {
  it('resolves none to an inert config', () => {
    const r = resolveAuth(parseAuth({ provider: 'none' }));
    expect(r).toEqual({
      provider: 'none',
      required: false,
      header: '',
      logoutUrl: null,
      trustedProxies: [],
      issuer: '',
      aud: [],
    });
  });

  it('expands the cloudflare preset to its header + logout url', () => {
    const r = resolveAuth(parseAuth({ provider: 'forward-header', preset: 'cloudflare' }));
    expect(r.header).toBe('Cf-Access-Authenticated-User-Email');
    expect(r.logoutUrl).toBe('/cdn-cgi/access/logout');
  });

  it('expands the authelia preset to Remote-Email with no logout url', () => {
    const r = resolveAuth(parseAuth({ provider: 'forward-header', preset: 'authelia' }));
    expect(r.header).toBe('Remote-Email');
    expect(r.logoutUrl).toBeNull();
  });

  it('lets an explicit header override the preset default', () => {
    const r = resolveAuth(
      parseAuth({ provider: 'forward-header', preset: 'cloudflare', header: 'X-My-User' }),
    );
    expect(r.header).toBe('X-My-User');
  });

  it('carries required + trustedProxies through', () => {
    const r = resolveAuth(
      parseAuth({
        provider: 'forward-header',
        preset: 'custom',
        header: 'X-User',
        required: true,
        trustedProxies: ['10.20.0.2/32'],
      }),
    );
    expect(r.required).toBe(true);
    expect(r.trustedProxies).toEqual(['10.20.0.2/32']);
  });
});

describe('resolveAuth cf-access-jwt', () => {
  const parse = (auth: unknown) => appConfigSchema.parse({ auth }).auth;

  it('derives issuer from teamDomain and normalizes a string aud', () => {
    const r = resolveAuth(
      parse({ provider: 'cf-access-jwt', teamDomain: 'team.cloudflareaccess.com', aud: 'aud-tag' }),
    );
    expect(r.provider).toBe('cf-access-jwt');
    expect(r.issuer).toBe('https://team.cloudflareaccess.com');
    expect(r.aud).toEqual(['aud-tag']);
    expect(r.header).toBe('Cf-Access-Jwt-Assertion');
    expect(r.logoutUrl).toBe('/cdn-cgi/access/logout');
  });

  it('keeps a list aud as-is and carries required through', () => {
    const r = resolveAuth(
      parse({
        provider: 'cf-access-jwt',
        teamDomain: 'team.cloudflareaccess.com',
        aud: ['a', 'b'],
        required: true,
      }),
    );
    expect(r.aud).toEqual(['a', 'b']);
    expect(r.required).toBe(true);
  });

  it('tolerates a teamDomain that already includes https://', () => {
    const r = resolveAuth(
      parse({ provider: 'cf-access-jwt', teamDomain: 'https://team.cloudflareaccess.com/', aud: 'x' }),
    );
    expect(r.issuer).toBe('https://team.cloudflareaccess.com');
  });
});

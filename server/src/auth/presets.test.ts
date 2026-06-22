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

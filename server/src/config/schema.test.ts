import { describe, it, expect } from 'vitest';
import { appConfigSchema } from './schema.ts';

describe('auth config schema', () => {
  it('defaults to provider none when auth is absent', () => {
    const cfg = appConfigSchema.parse({});
    expect(cfg.auth.provider).toBe('none');
    expect(cfg.auth.required).toBe(false);
  });

  it('parses a forward-header block', () => {
    const cfg = appConfigSchema.parse({
      auth: { provider: 'forward-header', preset: 'cloudflare', required: true },
    });
    expect(cfg.auth.provider).toBe('forward-header');
    expect(cfg.auth.preset).toBe('cloudflare');
    expect(cfg.auth.required).toBe(true);
  });

  it('rejects preset custom without an explicit header', () => {
    expect(() =>
      appConfigSchema.parse({ auth: { provider: 'forward-header', preset: 'custom' } }),
    ).toThrow(/header is required/);
  });

  it('rejects required:true with provider none', () => {
    expect(() =>
      appConfigSchema.parse({ auth: { provider: 'none', required: true } }),
    ).toThrow(/cannot be true when provider is none/);
  });
});

describe('cf-access-jwt auth schema', () => {
  const parseAuth = (auth: unknown) => appConfigSchema.parse({ auth });

  it('accepts cf-access-jwt with teamDomain + aud (string)', () => {
    const cfg = parseAuth({
      provider: 'cf-access-jwt',
      teamDomain: 'team.cloudflareaccess.com',
      aud: 'aud-tag',
      required: true,
    });
    expect(cfg.auth.provider).toBe('cf-access-jwt');
    expect(cfg.auth.teamDomain).toBe('team.cloudflareaccess.com');
    expect(cfg.auth.aud).toBe('aud-tag');
  });

  it('accepts aud as a list', () => {
    const cfg = parseAuth({
      provider: 'cf-access-jwt',
      teamDomain: 'team.cloudflareaccess.com',
      aud: ['a', 'b'],
    });
    expect(cfg.auth.aud).toEqual(['a', 'b']);
  });

  it('rejects cf-access-jwt without teamDomain', () => {
    expect(() => parseAuth({ provider: 'cf-access-jwt', aud: 'aud-tag' })).toThrow(/teamDomain/);
  });

  it('rejects cf-access-jwt without aud', () => {
    expect(() =>
      parseAuth({ provider: 'cf-access-jwt', teamDomain: 'team.cloudflareaccess.com' }),
    ).toThrow(/aud/);
  });

  it('rejects cf-access-jwt with an empty aud list', () => {
    expect(() =>
      parseAuth({ provider: 'cf-access-jwt', teamDomain: 'team.cloudflareaccess.com', aud: [] }),
    ).toThrow(/aud/);
  });

  it('still parses the default (provider none) clean', () => {
    expect(appConfigSchema.parse({}).auth.provider).toBe('none');
  });
});

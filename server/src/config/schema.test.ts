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

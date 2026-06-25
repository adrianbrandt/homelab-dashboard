import { describe, it, expect } from 'vitest';
import { getAuthProvider } from './index.ts';
import { NoneProvider } from './none.ts';
import { ForwardHeaderProvider } from './forward-header.ts';
import { CfAccessJwtProvider } from './cf-access-jwt.ts';
import type { ResolvedAuth } from './presets.ts';

const base: ResolvedAuth = {
  provider: 'none',
  required: false,
  header: '',
  logoutUrl: null,
  trustedProxies: [],
  issuer: '',
  aud: [],
};

describe('getAuthProvider', () => {
  it('returns NoneProvider for provider none', () => {
    expect(getAuthProvider(base)).toBeInstanceOf(NoneProvider);
  });

  it('returns ForwardHeaderProvider for provider forward-header', () => {
    const provider = getAuthProvider({ ...base, provider: 'forward-header', header: 'X-User' });
    expect(provider).toBeInstanceOf(ForwardHeaderProvider);
  });

  it('returns CfAccessJwtProvider for provider cf-access-jwt', () => {
    const provider = getAuthProvider({
      ...base,
      provider: 'cf-access-jwt',
      issuer: 'https://team.cloudflareaccess.com',
      aud: ['aud-tag'],
    });
    expect(provider).toBeInstanceOf(CfAccessJwtProvider);
  });
});

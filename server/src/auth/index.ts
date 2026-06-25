import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import type { AuthProvider } from './types.ts';
import type { ResolvedAuth } from './presets.ts';
import { NoneProvider } from './none.ts';
import { ForwardHeaderProvider } from './forward-header.ts';
import { CfAccessJwtProvider } from './cf-access-jwt.ts';

export function getAuthProvider(auth: ResolvedAuth, jwks?: JWTVerifyGetKey): AuthProvider {
  if (auth.provider === 'forward-header') {
    return new ForwardHeaderProvider(auth.header, auth.trustedProxies);
  }
  if (auth.provider === 'cf-access-jwt') {
    const set = jwks ?? createRemoteJWKSet(new URL(`${auth.issuer}/cdn-cgi/access/certs`));
    return new CfAccessJwtProvider({ issuer: auth.issuer, aud: auth.aud, jwks: set });
  }
  return new NoneProvider();
}

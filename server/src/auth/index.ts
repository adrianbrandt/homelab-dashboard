import type { AuthProvider } from './types.ts';
import type { ResolvedAuth } from './presets.ts';
import { NoneProvider } from './none.ts';
import { ForwardHeaderProvider } from './forward-header.ts';

export function getAuthProvider(auth: ResolvedAuth): AuthProvider {
  if (auth.provider === 'forward-header') {
    return new ForwardHeaderProvider(auth.header, auth.trustedProxies);
  }
  return new NoneProvider();
}

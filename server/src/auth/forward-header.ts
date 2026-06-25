import type express from 'express';
import type { Identity } from '@dashboard/shared';
import type { AuthProvider } from './types.ts';
import { ipMatchesAny } from './cidr.ts';

export class ForwardHeaderProvider implements AuthProvider {
  private header: string;
  private trustedProxies: string[];

  constructor(header: string, trustedProxies: string[]) {
    // express lower-cases header keys on req.headers
    this.header = header.toLowerCase();
    this.trustedProxies = trustedProxies;
  }

  async resolve(req: express.Request): Promise<Identity | null> {
    if (this.trustedProxies.length > 0) {
      if (!ipMatchesAny(req.socket.remoteAddress, this.trustedProxies)) return null;
    }
    const raw = req.headers[this.header];
    if (typeof raw !== 'string') return null; // missing, or array (duplicate) → untrusted
    if (raw.includes(',')) return null; // multi-valued → forged
    const user = raw.trim();
    if (!user) return null;
    return { user };
  }
}

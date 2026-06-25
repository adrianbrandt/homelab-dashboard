import type express from 'express';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Identity } from '@dashboard/shared';
import type { AuthProvider } from './types.ts';

const HEADER = 'cf-access-jwt-assertion'; // express lower-cases header keys

export interface CfAccessJwtOptions {
  issuer: string;
  aud: string[];
  jwks: JWTVerifyGetKey;
}

export class CfAccessJwtProvider implements AuthProvider {
  private issuer: string;
  private aud: string[];
  private jwks: JWTVerifyGetKey;

  constructor(opts: CfAccessJwtOptions) {
    this.issuer = opts.issuer;
    this.aud = opts.aud;
    this.jwks = opts.jwks;
  }

  async resolve(req: express.Request): Promise<Identity | null> {
    const raw = req.headers[HEADER];
    if (typeof raw !== 'string') return null; // missing, or array (duplicate) → untrusted
    const token = raw.trim();
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.aud,
        algorithms: ['RS256'],
      });
      const email = payload.email;
      if (typeof email !== 'string' || email.trim() === '') return null;
      return { user: email };
    } catch {
      return null; // bad signature / expired / wrong aud|iss / JWKS unreachable → fail closed
    }
  }
}

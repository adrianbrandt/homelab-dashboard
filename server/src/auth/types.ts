import type express from 'express';
import type { Identity } from '@dashboard/shared';

export interface AuthProvider {
  resolve(req: express.Request): Promise<Identity | null>;
}

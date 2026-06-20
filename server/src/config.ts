import 'dotenv/config';
import { DEFAULT_THRESHOLDS, type Thresholds } from '@dashboard/shared';

export type { HostConfig } from './config/schema.ts';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  dataSource: (process.env.DATA_SOURCE ?? 'mock') as 'mock' | 'prometheus',
  prometheusUrl: process.env.PROMETHEUS_URL ?? 'http://127.0.0.1:9090',
  thresholds: {
    usageWarnPercent: Number(
      process.env.USAGE_WARN_PERCENT ?? DEFAULT_THRESHOLDS.usageWarnPercent,
    ),
    tempWarnC: Number(process.env.TEMP_WARN_C ?? DEFAULT_THRESHOLDS.tempWarnC),
  } satisfies Thresholds,
};

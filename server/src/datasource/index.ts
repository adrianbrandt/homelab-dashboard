import type { DataSource } from '@dashboard/shared';
import { config, type HostConfig } from '../config.ts';
import { MockDataSource } from './mock.ts';
import { PrometheusDataSource } from './prometheus.ts';

export function getDataSource(hosts: HostConfig[]): DataSource {
  if (config.dataSource === 'prometheus') {
    return new PrometheusDataSource(hosts, config.thresholds, { baseUrl: config.prometheusUrl });
  }
  return new MockDataSource(hosts, config.thresholds);
}

import type { ZodType } from 'zod';

export interface WidgetModule<C = unknown, D = unknown> {
  type: string;
  configSchema: ZodType<C>;
  fetch(config: C): Promise<D>;
}

import { z } from 'zod';

export const sourceSchema = z.object({
  type: z.literal('prometheus').default('prometheus'),
  instance: z.string(),
  mountpoint: z.string().optional(),
});

export const linkSchema = z.object({ label: z.string(), url: z.string() });

export const hostSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(['compute', 'storage']).optional(),
    source: sourceSchema,
    links: z.array(linkSchema).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.kind === 'storage' && !val.source.mountpoint) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source', 'mountpoint'],
        message: 'mountpoint is required for storage hosts',
      });
    }
  });

// Widgets keep unknown keys (items/url/key/…) for per-widget validation later.
export const widgetSchema = z.object({ id: z.string().optional(), type: z.string() }).catchall(z.unknown());

export const groupSchema = z.object({ name: z.string(), widgets: z.array(widgetSchema).default([]) });

export const appConfigSchema = z.object({
  settings: z.object({ title: z.string().default('Homelab') }).default({ title: 'Homelab' }),
  hosts: z.array(hostSchema).default([]),
  groups: z.array(groupSchema).default([]),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type HostConfig = z.infer<typeof hostSchema>;
export type GroupConfig = z.infer<typeof groupSchema>;
export type WidgetInstanceConfig = z.infer<typeof widgetSchema>;

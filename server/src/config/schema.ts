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

export const AUTH_PRESETS = [
  'cloudflare',
  'authelia',
  'authentik',
  'oauth2-proxy',
  'tailscale',
  'custom',
] as const;

export const authSchema = z
  .object({
    provider: z.enum(['none', 'forward-header', 'cf-access-jwt']).default('none'),
    preset: z.enum(AUTH_PRESETS).optional(),
    required: z.boolean().default(false),
    header: z.string().optional(),
    trustedProxies: z.array(z.string()).optional(),
    logoutUrl: z.string().optional(),
    teamDomain: z.string().optional(),
    aud: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .default({ provider: 'none', required: false });

export const appConfigSchema = z
  .object({
    settings: z.object({ title: z.string().default('Homelab') }).default({ title: 'Homelab' }),
    auth: authSchema,
    hosts: z.array(hostSchema).default([]),
    groups: z.array(groupSchema).default([]),
  })
  .superRefine((cfg, ctx) => {
    const a = cfg.auth;
    if (a.provider === 'forward-header' && a.preset === 'custom' && !a.header) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['auth', 'header'],
        message: 'header is required when preset is custom',
      });
    }
    if (a.required && a.provider === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['auth', 'required'],
        message: 'auth.required cannot be true when provider is none',
      });
    }
    if (a.provider === 'cf-access-jwt') {
      if (!a.teamDomain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['auth', 'teamDomain'],
          message: 'teamDomain is required when provider is cf-access-jwt',
        });
      }
      const audEmpty =
        a.aud === undefined ||
        (typeof a.aud === 'string' && a.aud.trim() === '') ||
        (Array.isArray(a.aud) && a.aud.length === 0);
      if (audEmpty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['auth', 'aud'],
          message: 'aud is required (non-empty) when provider is cf-access-jwt',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AuthConfig = z.infer<typeof authSchema>;
export type HostConfig = z.infer<typeof hostSchema>;
export type GroupConfig = z.infer<typeof groupSchema>;
export type WidgetInstanceConfig = z.infer<typeof widgetSchema>;

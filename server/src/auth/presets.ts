import type { AuthConfig } from '../config/schema.ts';

export interface ResolvedAuth {
  provider: 'none' | 'forward-header';
  required: boolean;
  header: string;
  logoutUrl: string | null;
  trustedProxies: string[];
}

type PresetDefault = { header: string; logoutUrl: string | null };

const PRESET_DEFAULTS: Record<string, PresetDefault> = {
  cloudflare: { header: 'Cf-Access-Authenticated-User-Email', logoutUrl: '/cdn-cgi/access/logout' },
  authelia: { header: 'Remote-Email', logoutUrl: null },
  authentik: { header: 'Remote-Email', logoutUrl: null },
  'oauth2-proxy': { header: 'X-Forwarded-Email', logoutUrl: null },
  tailscale: { header: 'Tailscale-User-Login', logoutUrl: null },
  custom: { header: '', logoutUrl: null },
};

export function resolveAuth(auth: AuthConfig): ResolvedAuth {
  if (auth.provider === 'none') {
    return { provider: 'none', required: false, header: '', logoutUrl: null, trustedProxies: [] };
  }
  const preset: PresetDefault = auth.preset
    ? PRESET_DEFAULTS[auth.preset]
    : { header: '', logoutUrl: null };
  return {
    provider: 'forward-header',
    required: auth.required,
    header: auth.header ?? preset.header,
    logoutUrl: auth.logoutUrl ?? preset.logoutUrl,
    trustedProxies: auth.trustedProxies ?? [],
  };
}

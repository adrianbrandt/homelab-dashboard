import type { AuthConfig } from '../config/schema.ts';

export interface ResolvedAuth {
  provider: 'none' | 'forward-header' | 'cf-access-jwt';
  required: boolean;
  header: string;
  logoutUrl: string | null;
  trustedProxies: string[];
  issuer: string;
  aud: string[];
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
    return {
      provider: 'none',
      required: false,
      header: '',
      logoutUrl: null,
      trustedProxies: [],
      issuer: '',
      aud: [],
    };
  }
  if (auth.provider === 'cf-access-jwt') {
    const host = (auth.teamDomain ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const aud = Array.isArray(auth.aud) ? auth.aud : auth.aud ? [auth.aud] : [];
    return {
      provider: 'cf-access-jwt',
      required: auth.required,
      header: 'Cf-Access-Jwt-Assertion',
      logoutUrl: auth.logoutUrl ?? '/cdn-cgi/access/logout',
      trustedProxies: [],
      issuer: `https://${host}`,
      aud,
    };
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
    issuer: '',
    aud: [],
  };
}

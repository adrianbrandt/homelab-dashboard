import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { appConfigSchema, type AppConfig } from './schema.ts';

export class ConfigError extends Error {}

export function interpolateEnv(text: string): string {
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    const v = process.env[name];
    if (v === undefined) throw new ConfigError(`config references missing env var: ${name}`);
    return v;
  });
}

export function parseConfig(text: string): AppConfig {
  const interpolated = interpolateEnv(text);
  let raw: unknown;
  try {
    raw = parse(interpolated);
  } catch (e) {
    throw new ConfigError(`config is not valid YAML: ${(e as Error).message}`);
  }
  const result = appConfigSchema.safeParse(raw ?? {});
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new ConfigError(`invalid config: ${msg}`);
  }
  return result.data;
}

export function loadConfig(opts: { path?: string; text?: string } = {}): AppConfig {
  if (opts.text !== undefined) return parseConfig(opts.text);
  const path = opts.path ?? process.env.CONFIG_PATH ?? '/config/config.yaml';
  if (!existsSync(path)) return appConfigSchema.parse({});
  return parseConfig(readFileSync(path, 'utf8'));
}

import type { WidgetResult } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${Math.round(ms / 1000)}s`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : 'unknown error';
}

export async function runWidget(
  mod: WidgetModule,
  rawConfig: unknown,
  timeoutMs = 8000,
): Promise<WidgetResult> {
  try {
    const config = mod.configSchema.parse(rawConfig);
    const data = await withTimeout(Promise.resolve(mod.fetch(config)), timeoutMs);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { runWidget, withTimeout } from './run.ts';
import type { WidgetModule } from './types.ts';

const mod = (fetchImpl: (c: { type: string }) => Promise<unknown>): WidgetModule => ({
  type: 'fake',
  configSchema: z.object({ type: z.literal('fake') }),
  fetch: fetchImpl as WidgetModule['fetch'],
});

describe('withTimeout', () => {
  it('rejects after the budget with a timeout message', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow(/timeout/);
  });
});

describe('runWidget', () => {
  it('wraps a successful fetch as ok:true', async () => {
    const r = await runWidget(mod(async () => ({ n: 1 })), { type: 'fake' });
    expect(r).toEqual({ ok: true, data: { n: 1 } });
  });

  it('wraps a thrown error as ok:false', async () => {
    const r = await runWidget(mod(async () => { throw new Error('upstream 500'); }), { type: 'fake' });
    expect(r).toEqual({ ok: false, error: 'upstream 500' });
  });

  it('wraps invalid config as ok:false without calling fetch', async () => {
    let called = false;
    const r = await runWidget(mod(async () => { called = true; return {}; }), { type: 'wrong' });
    expect(r.ok).toBe(false);
    expect(called).toBe(false);
  });

  it('wraps a slow fetch as a timeout', async () => {
    const r = await runWidget(mod(() => new Promise(() => {})), { type: 'fake' }, 10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/timeout/);
  });
});

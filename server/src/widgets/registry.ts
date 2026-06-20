import type { AppConfig } from '../config/schema.ts';
import type { WidgetModule } from './types.ts';

const registry = new Map<string, WidgetModule>();

export function registerWidget(m: WidgetModule): void {
  registry.set(m.type, m);
}

export function getWidget(type: string): WidgetModule | undefined {
  return registry.get(type);
}

export function validateLayout(appConfig: AppConfig): void {
  for (const g of appConfig.groups) {
    for (const w of g.widgets) {
      const m = getWidget(w.type);
      if (!m) throw new Error(`unknown widget type "${w.type}" in group "${g.name}"`);
      const r = m.configSchema.safeParse(w);
      if (!r.success) {
        const msg = r.error.issues.map((i) => i.message).join('; ');
        throw new Error(`invalid config for widget "${w.type}" in group "${g.name}": ${msg}`);
      }
    }
  }
}

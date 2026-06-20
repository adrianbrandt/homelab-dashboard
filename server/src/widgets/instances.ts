import type { AppConfig, WidgetInstanceConfig } from '../config/schema.ts';

export interface WidgetInstance {
  id: string;
  type: string;
  config: WidgetInstanceConfig;
}

export function widgetInstances(appConfig: AppConfig): WidgetInstance[] {
  const out: WidgetInstance[] = [];
  appConfig.groups.forEach((g, gi) => {
    g.widgets.forEach((w, wi) => {
      const id = (w.id as string | undefined) ?? `${gi}-${wi}`;
      out.push({ id, type: w.type, config: w });
    });
  });
  return out;
}

import { registerWidget } from './registry.ts';
import { bookmarks } from './bookmarks.ts';
import { sonarr } from './sonarr.ts';
import { radarr } from './radarr.ts';
import { adguard } from './adguard.ts';

registerWidget(bookmarks);
registerWidget(sonarr);
registerWidget(radarr);
registerWidget(adguard);

export { getWidget, validateLayout } from './registry.ts';
export { widgetInstances, type WidgetInstance } from './instances.ts';
export { runWidget } from './run.ts';

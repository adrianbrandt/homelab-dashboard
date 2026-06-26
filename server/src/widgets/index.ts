import { registerWidget } from './registry.ts';
import { bookmarks } from './bookmarks.ts';
import { sonarr } from './sonarr.ts';
import { radarr } from './radarr.ts';
import { adguard } from './adguard.ts';
import { prowlarr } from './prowlarr.ts';
import { overseerr } from './overseerr.ts';
import { plex } from './plex.ts';
import { qbittorrent } from './qbittorrent.ts';

registerWidget(bookmarks);
registerWidget(sonarr);
registerWidget(radarr);
registerWidget(adguard);
registerWidget(prowlarr);
registerWidget(overseerr);
registerWidget(plex);
registerWidget(qbittorrent);

export { getWidget, validateLayout } from './registry.ts';
export { widgetInstances, type WidgetInstance } from './instances.ts';
export { runWidget } from './run.ts';

import type { FC } from 'react';
import { Bookmarks } from './Bookmarks.tsx';
import { Sonarr } from './Sonarr.tsx';
import { Radarr } from './Radarr.tsx';
import { Adguard } from './Adguard.tsx';
import { Prowlarr } from './Prowlarr.tsx';
import { Overseerr } from './Overseerr.tsx';

export const widgetRegistry = new Map<string, FC<{ data: unknown }>>([
  ['bookmarks', Bookmarks as FC<{ data: unknown }>],
  ['sonarr', Sonarr as FC<{ data: unknown }>],
  ['radarr', Radarr as FC<{ data: unknown }>],
  ['adguard', Adguard as FC<{ data: unknown }>],
  ['prowlarr', Prowlarr as FC<{ data: unknown }>],
  ['overseerr', Overseerr as FC<{ data: unknown }>],
]);

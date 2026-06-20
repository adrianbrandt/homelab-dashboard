import { z } from 'zod';
import type { BookmarksData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('bookmarks'),
  items: z.array(z.object({ label: z.string(), url: z.string() })),
});

type Config = z.infer<typeof schema>;

export const bookmarks: WidgetModule<Config, BookmarksData> = {
  type: 'bookmarks',
  configSchema: schema,
  async fetch(config) {
    return { items: config.items };
  },
};

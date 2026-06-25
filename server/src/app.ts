import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API_BASE,
  SERIES_WINDOWS,
  type ApiResponse,
  type ContainersResponse,
  type DataSource,
  type HostDetail,
  type HostsResponse,
  type Identity,
  type LayoutResponse,
  type MeResponse,
  type SeriesWindow,
} from '@dashboard/shared';
import { getDataSource } from './datasource/index.ts';
import { loadConfig } from './config/load.ts';
import type { AppConfig } from './config/schema.ts';
import { getWidget, widgetInstances, runWidget } from './widgets/index.ts';
import { resolveAuth } from './auth/presets.ts';
import { getAuthProvider } from './auth/index.ts';
import type { AuthProvider } from './auth/types.ts';

type AuthedRequest = express.Request & { identity?: Identity | null };

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp(
  opts: {
    webDist?: string;
    dataSource?: DataSource;
    appConfig?: AppConfig;
    authProvider?: AuthProvider;
  } = {},
) {
  const app = express();
  app.use(express.json());

  const appConfig = opts.appConfig ?? loadConfig();
  const dataSource = opts.dataSource ?? getDataSource(appConfig.hosts);

  const auth = resolveAuth(appConfig.auth);
  const authProvider = opts.authProvider ?? getAuthProvider(auth);

  // Resolve identity for every /api request; never throws.
  app.use(API_BASE, async (req, _res, next) => {
    try {
      (req as AuthedRequest).identity = await authProvider.resolve(req);
    } catch {
      (req as AuthedRequest).identity = null;
    }
    next();
  });

  app.get(`${API_BASE}/health`, (_req, res) => {
    res.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev' });
  });

  app.get(`${API_BASE}/me`, (req, res) => {
    const identity = (req as AuthedRequest).identity ?? null;
    const body: ApiResponse<MeResponse> = {
      data: { user: identity?.user ?? null, required: auth.required, logoutUrl: auth.logoutUrl },
    };
    res.json(body);
  });

  // Gate the rest of the API. health + me are registered above and stay open.
  app.use(API_BASE, (req, res, next) => {
    if (auth.required && !(req as AuthedRequest).identity) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    next();
  });

  app.get(`${API_BASE}/hosts`, async (_req, res) => {
    const hosts = await dataSource.getHosts();
    const body: ApiResponse<HostsResponse> = {
      data: { hosts, generatedAt: new Date().toISOString() },
    };
    res.json(body);
  });

  app.get(`${API_BASE}/hosts/:id`, async (req, res) => {
    const detail = await dataSource.getHostDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: 'host not found' });
      return;
    }
    const body: ApiResponse<HostDetail> = { data: detail };
    res.json(body);
  });

  app.get(`${API_BASE}/hosts/:id/series`, async (req, res) => {
    const raw = String(req.query.window ?? '');
    const requestedWindow: SeriesWindow = (SERIES_WINDOWS as string[]).includes(raw)
      ? (raw as SeriesWindow)
      : '6h';
    const series = await dataSource.getHostSeries(req.params.id, requestedWindow);
    res.json({ data: series });
  });

  app.get(`${API_BASE}/containers`, async (_req, res) => {
    const data = await dataSource.getContainers();
    const body: ApiResponse<ContainersResponse> = { data };
    res.json(body);
  });

  app.get(`${API_BASE}/layout`, (_req, res) => {
    const groups = appConfig.groups.map((g, gi) => ({
      name: g.name,
      widgets: g.widgets.map((w, wi) => ({
        id: (w.id as string | undefined) ?? `${gi}-${wi}`,
        type: w.type,
      })),
    }));
    const body: ApiResponse<LayoutResponse> = {
      data: { settings: appConfig.settings, groups },
    };
    res.json(body);
  });

  app.get(`${API_BASE}/widget/:id`, async (req, res) => {
    const inst = widgetInstances(appConfig).find((i) => i.id === req.params.id);
    if (!inst) {
      res.status(404).json({ error: 'widget not found' });
      return;
    }
    const mod = getWidget(inst.type);
    if (!mod) {
      res.status(404).json({ error: 'widget type not registered' });
      return;
    }
    const result = await runWidget(mod, inst.config);
    res.json(result);
  });

  // Serve the built SPA + client-routing fallback (prod, single deploy).
  const webDist = opts.webDist ?? process.env.WEB_DIST ?? path.resolve(here, '../../web/dist');
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });

  return app;
}

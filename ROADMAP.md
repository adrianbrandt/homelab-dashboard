# Roadmap

> homelab-dashboard is in early development (`0.x`). Expect breaking config changes between releases.

---

## ✅ M0 — Foundation

Config-driven model: YAML `hosts:` + `groups:` → `widgets:` with env-interpolated secrets (`{{VAR}}`). Widget contract established (server-side `WidgetResult` discriminated union; web-side `useWidget` + `Widget` renderer). `bookmarks` tile ships as the reference widget. Backend proxy keeps secrets off the browser. Startup validation (`validateLayout`) fails fast on bad config.

## ✅ M1 — First service widgets

Real service widgets on the M0 contract:

- **sonarr** — queue depth, series count, upcoming episodes (7-day calendar)
- **radarr** — queue depth, movie count, missing movies
- **adguard** — DNS query count, blocked count, blocked percentage

Host-owned failure handling: `runWidget` wraps every widget fetch with an 8-second timeout; widget modules write only the happy path; `WidgetResult` carries `ok:true|false` so the UI renders a clean error tile instead of crashing.

## 🔨 M2 — Productize *(in progress)*

1. **OSS release bundle** — public README, CONTRIBUTING guide, config reference, example config, published Docker image. *(active)*
2. **Pluggable forward-auth** — trust the `Cf-Access-Authenticated-User-Email` header (or any equivalent header from a reverse proxy / identity-aware proxy) for app-level auth, so deployments behind a forward-auth layer get per-user identity without managing their own credentials.
3. **Theming + layout polish** — CSS custom-property theme tokens, layout density options, mobile-friendly grid.

## Ongoing

- More service widgets (Plex, Jellyfin, Home Assistant, Uptime Kuma, …)
- More hosts as pure config — no code changes required to add a new machine
- Optional hot-reload of `config.yaml` without a container restart
- Full mock / demo mode — run the dashboard with zero external services for evaluation or CI

---

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

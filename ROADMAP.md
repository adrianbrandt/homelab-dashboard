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

## ✅ M2 — Productize *(in progress)*

1. ✅ **OSS release bundle** — public README, CONTRIBUTING guide, config reference, example config, published Docker image.
2. ✅ **Pluggable forward-auth (M2.2)** — `auth:` config block with `provider: forward-header`; presets for Cloudflare Access, Authelia, Authentik, oauth2-proxy, Tailscale, and custom; `required` enforcement gate; `/api/me`; user chip + logout; blocked page. ⚠️ The identity header is unsigned — forward-header trust requires network isolation (only your proxy can reach the app).
   - 🔨 **cf-access-jwt (M2.2b)** — cryptographic Cloudflare Access JWT verification. The only forward-auth mode that is safe without network isolation. *(next)*
3. **Theming + layout polish (M2.3)** — CSS custom-property theme tokens, layout density options, mobile-friendly grid.

## Ongoing

- More service widgets (Plex, Jellyfin, Home Assistant, Uptime Kuma, …)
- More hosts as pure config — no code changes required to add a new machine
- Optional hot-reload of `config.yaml` without a container restart
- Full mock / demo mode — run the dashboard with zero external services for evaluation or CI

---

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

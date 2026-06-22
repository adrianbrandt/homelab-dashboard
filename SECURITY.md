# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
issue. Email **a.sleire.b@gmail.com** with a description of the issue, steps to
reproduce, and the affected version (image tag or commit). You can expect an
acknowledgement within a few days, and we'll work with you on a fix and
coordinated disclosure.

## Security posture (read before exposing this)

**homelab-dashboard ships pluggable app-level auth (M2.2).** Forward-header
auth is opt-in (`auth.provider: forward-header` in `config.yaml`); by default
the dashboard is open (`provider: none`) — do **not** expose the default config
directly to the internet.

- **Forward-header trust is not a cryptographic boundary.** The identity header
  is unsigned, so it is only an access boundary when your proxy is the *only*
  thing that can reach the app. On a shared Docker network, any sibling
  container can forge the header — **network isolation is required**, not just
  localhost-publishing.
- For a cryptographic boundary that is safe without network isolation,
  Cloudflare Access JWT verification (`cf-access-jwt`) is planned (M2.2b) and
  will be the only mode safe without isolation.
- Until `cf-access-jwt` lands, run the dashboard on your LAN or isolate it so
  only your reverse proxy (Authelia, Authentik, Cloudflare Access, Caddy
  `basic_auth`, Tailscale, …) can reach port 3001 directly.
- See the **Security model** section of the [README](README.md#security-model)
  for the preset table and deployment examples.

## How secrets are handled

Service credentials (API keys, passwords) are referenced in `config.yaml` with
`{{ENV_VAR}}` placeholders and resolved **server-side** at startup from the
process environment. They are used only for outbound calls to your services and
are **never** sent to the browser:

- `GET /api/layout` returns only widget `id` and `type` — never widget config.
- `GET /api/widget/:id` returns a service's summarized data, or a structured
  error containing the request URL but never the secret.

Because secrets live in the environment and not in the file, `config.yaml`
itself is safe to commit or share.

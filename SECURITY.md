# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
issue. Email **a.sleire.b@gmail.com** with a description of the issue, steps to
reproduce, and the affected version (image tag or commit). You can expect an
acknowledgement within a few days, and we'll work with you on a fix and
coordinated disclosure.

## Security posture (read before exposing this)

**homelab-dashboard ships pluggable app-level auth (M2.2 + M2.2b).** Auth is
opt-in; by default the dashboard is open (`provider: none`) — do **not** expose
the default config directly to the internet.

- **`cf-access-jwt` is the recommended Cloudflare option — a cryptographic
  boundary.** It verifies the signed `Cf-Access-Jwt-Assertion` token against
  Cloudflare's published JWKS (signature + issuer + audience + expiry). Because
  the token is signed, it is a real access boundary **even on a shared network**
  — no network isolation required.
- **Forward-header trust is not a cryptographic boundary.** With
  `provider: forward-header` the identity header is unsigned, so it is only an
  access boundary when your proxy is the *only* thing that can reach the app. On
  a shared Docker network, any sibling container can forge the header —
  **network isolation is required**, not just localhost-publishing.
- With `forward-header`, run the dashboard on your LAN or isolate it so only your
  reverse proxy (Authelia, Authentik, Cloudflare Access, Caddy `basic_auth`,
  Tailscale, …) can reach port 3001 directly.
- See the **Security model** section of the [README](README.md#security-model)
  for the preset table, the `cf-access-jwt` block, and deployment examples.

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

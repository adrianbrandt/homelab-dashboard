# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
issue. Email **a.sleire.b@gmail.com** with a description of the issue, steps to
reproduce, and the affected version (image tag or commit). You can expect an
acknowledgement within a few days, and we'll work with you on a fix and
coordinated disclosure.

## Security posture (read before exposing this)

> **homelab-dashboard has no built-in authentication yet.** Do **not** expose
> it directly to the internet.

- Run it on your LAN, or put it behind your own reverse proxy + authentication
  (Authelia, Authentik, Cloudflare Access, Caddy `basic_auth`, Tailscale, …).
- Pluggable forward-auth (header trust) is on the [roadmap](ROADMAP.md); until
  then, perimeter auth is your responsibility.
- See the **Security model** section of the [README](README.md#security-model)
  for the same guidance with deployment examples.

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

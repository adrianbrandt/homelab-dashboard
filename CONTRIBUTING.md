# Contributing to homelab-dashboard

Thank you for your interest in contributing. This guide covers everything you
need to get a working dev environment, the conventions that will fail your
build if ignored, and a step-by-step walkthrough of how to add a new service
widget.

---

## Dev setup

**Prerequisites:** Node 24, npm 10+.

```bash
git clone https://github.com/adrianbrandt/homelab-dashboard.git
cd homelab-dashboard
npm install          # installs all workspaces (shared / server / web)
```

### Running locally

```bash
# Dev server — Express :3001 + Vite proxy, single origin
npm run dev

# Against fake data (no real services needed)
CONFIG_PATH=./config.example.yaml DATA_SOURCE=mock npm run dev
```

Other commands:

```bash
npm run build        # build all workspaces in dependency order
npm test             # run all Vitest suites
npm run lint         # ESLint across all workspaces
```

### Building shared before isolated tests

`@dashboard/shared` is consumed as a built `dist`, not TypeScript source.
If you run server or web tests in isolation (without the workspace root
script), build shared first:

```bash
npm run build:shared
cd server && npm test   # or cd web && npm test
```

The root `npm test` handles build ordering automatically.

---

## Conventions — these will fail CI or crash the server if ignored

### 1. Exact-pinned package versions

All `package.json` files use exact versions — no `^`, no `~`, no bare majors.
When adding a dependency, pin the exact version from `package-lock.json`:

```bash
# good
npm install some-package --save-exact

# bad — will fail the project convention
npm install some-package   # adds ^ by default
```

### 2. No TypeScript parameter properties in `server/`

**Do not use the `constructor(private readonly x: T)` shorthand in any
`server/` code.**

The server runs with `node --watch src/index.ts` (Node 24 native strip-only
TypeScript). This strips type annotations but does **not** compile TypeScript
syntax like parameter properties. The result: `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`
at boot, while Vitest (which compiles fully) still passes your tests. The bug
is invisible in tests.

Always declare class fields explicitly and assign in the constructor body:

```typescript
// WRONG — crashes the server at boot (Vitest still passes)
class MyClass {
  constructor(private readonly value: string) {}
}

// CORRECT
class MyClass {
  private readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
}
```

### 3. ESM `.ts` import extensions

All relative imports within `server/` and `shared/` use the `.ts` extension
(NodeNext ESM):

```typescript
import { something } from './module.ts';   // correct
import { something } from './module';      // wrong — breaks at runtime
```

### 4. Tests first (Vitest + Testing Library / supertest)

Write tests before or alongside new code. The project uses:

- **`server/`** — Vitest + supertest for route tests, with an injectable
  `dataSource` / `http` factory so tests never hit a real service.
- **`web/`** — Vitest + Testing Library.

### 5. Conventional commits (enforced by Husky + Commitlint)

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/)
spec. Commitlint is wired to the `commit-msg` Husky hook and will reject
non-conforming messages.

```
feat: add plex widget
fix: handle adguard auth timeout
docs: update widget walkthrough
```

---

## How to add a service widget

A widget has two sides: a **server module** (fetches data from a service API)
and a **web tile** (renders it). They are joined by a shared data type and a
config schema validated at startup.

### Step 1 — Add the data type to `shared/src/index.ts`

Export an interface describing the data your widget returns. This type flows
from the server fetch to the web tile.

```typescript
// shared/src/index.ts
export interface PlexData {
  activeSessions: number;
  totalLibraryItems: number;
}
```

Rebuild shared after editing it:

```bash
npm run build:shared
```

### Step 2 — Create `server/src/widgets/<name>.ts`

This is the server-side widget module. It must satisfy the `WidgetModule`
interface from `./types.ts`.

Key points from the real codebase:

- **Config schema** — a Zod object with `type: z.literal('<name>')` plus any
  connection fields (`url`, `key`, `username`, `password`, …).
- **Factory function** `make<Name>(http: HttpJson = httpJson)` — takes an
  injectable `HttpJson` helper (from `./http.ts`) so tests can provide a fake
  without hitting a real service. Returns a `WidgetModule` object.
- **`fetch(config)`** — returns **only the happy-path data**. It must not
  catch errors or handle timeouts itself. The host wrapper `runWidget` (in
  `./run.ts`) owns the 8-second timeout and wraps success/throw into a
  `WidgetResult`. If your fetch throws, `runWidget` catches it and returns
  `{ ok: false, error: '...' }` — no stack trace reaches the browser.
- **Default export** — `export const <name> = make<Name>()` so
  `widgets/index.ts` can import it directly.

Model on `sonarr.ts` (real API + auth) or `bookmarks.ts` (no API, minimal):

```typescript
// server/src/widgets/plex.ts
import { z } from 'zod';
import type { PlexData } from '@dashboard/shared';
import type { WidgetModule } from './types.ts';
import { httpJson, type HttpJson } from './http.ts';

const schema = z.object({
  id: z.string().optional(),
  type: z.literal('plex'),
  url: z.string(),
  key: z.string(),        // X-Plex-Token
});
type Config = z.infer<typeof schema>;

export function makePlex(http: HttpJson = httpJson): WidgetModule<Config, PlexData> {
  return {
    type: 'plex',
    configSchema: schema,
    async fetch(config) {
      const sessions = await http(`${config.url}/status/sessions`, {
        headers: { 'X-Plex-Token': config.key, Accept: 'application/json' },
      });
      // parse sessions.MediaContainer and return only happy-path data
      return { activeSessions: sessions.MediaContainer.size, totalLibraryItems: 0 };
    },
  };
}

export const plex = makePlex();
```

Secrets (`key`, `password`, …) arrive from the resolved config — they are
never hard-coded or logged. `runWidget` strips error messages via `messageOf`
which returns only `e.message`, not the full stack or the raw config.

### Step 3 — Register in `server/src/widgets/index.ts`

```typescript
import { plex } from './plex.ts';
registerWidget(plex);
```

`registerWidget` adds the module to the in-memory registry keyed by
`module.type`. `validateLayout` (called at startup) will then parse every
widget config against its `configSchema` and throw with a clear message if
anything is wrong.

### Step 4 — Create `web/src/widgets/<Name>.tsx` and register it

Build on the shared `StatTile` component (`web/src/components/StatTile.tsx`),
which takes a `title` and an array of `{ label, value }` metrics:

```tsx
// web/src/widgets/Plex.tsx
import type { PlexData } from '@dashboard/shared';
import { StatTile } from '../components/StatTile.tsx';

export function Plex({ data }: { data: PlexData }) {
  return (
    <StatTile
      title="Plex"
      metrics={[
        { label: 'sessions', value: data.activeSessions },
        { label: 'library', value: data.totalLibraryItems.toLocaleString() },
      ]}
    />
  );
}
```

Register it in `web/src/widgets/registry.ts`:

```typescript
import { Plex } from './Plex.tsx';
widgetRegistry.set('plex', Plex as FC<{ data: unknown }>);
```

The `Widget.tsx` host component looks up the tile by the widget type string
returned from `GET /api/layout` and renders it with the data from
`GET /api/widget/:id`. Unknown types show an "unsupported widget" fallback.

### Step 5 — Add config docs to `config.example.yaml`

Document the widget under the relevant group in `config.example.yaml`.
Secrets are referenced with double-brace env placeholders — they are resolved
server-side at startup, never sent to the browser:

```yaml
groups:
  - name: Media
    widgets:
      - type: plex
        url: http://192.168.1.10:32400
        key: "{{PLEX_TOKEN}}"
```

### Widget reference implementations

| Widget | Where | What it shows |
|--------|-------|---------------|
| `bookmarks` | `server/src/widgets/bookmarks.ts` | Minimal — no API, just config passthrough. Start here if your widget has no external service. |
| `adguard` | `server/src/widgets/adguard.ts` | HTTP Basic auth, single stats endpoint. Good template for simple REST APIs. |
| `sonarr` | `server/src/widgets/sonarr.ts` | Multiple parallel API calls, shared `arr-client.ts` HTTP helper. Good template for services with multiple endpoints. |

---

## Submitting changes

1. Fork the repo and create a feature branch.
2. Write tests first (or alongside) — PRs without tests for new behaviour
   will be asked to add them.
3. Run `npm run build && npm test && npm run lint` — all must pass.
4. Open a pull request against `main`. The PR template will prompt you for
   the checklist items.

For large changes (new widget types, architecture changes), open an issue
first so the design can be discussed before implementation.

---

## Security

See [SECURITY.md](SECURITY.md) for the current security posture and how to
report vulnerabilities privately.

# `@turtle.tech/utils`

Shared utilities for the Trellis monorepo.

> **Status: scaffold.** `src/index.ts` is currently a placeholder. This package exists so that genuinely cross-cutting helpers have an obvious home when they appear.

---

## When to put a util here

Add a utility to this package only if **all** of the following hold:

1. The function is needed in **two or more** workspace packages.
2. It is **pure** (no side effects, no framework runtime).
3. It is **stable** — the API isn't going to churn weekly.

Otherwise:

- **Frontend-only helpers** → `apps/web/app/utils/` (Nuxt auto-imports these)
- **Server-only helpers** → `apps/web/server/utils/`
- **TQL helpers** → `packages/tql/` (alongside the relevant module)
- **MCP/CLI helpers** → that package's `src/`

---

## Usage

```ts
import { /* ... */ } from '@turtle.tech/utils'
```

The package is workspace-internal (`"private": true`); never publish it.

---

## Tests

```bash
pnpm --filter @turtle.tech/utils test
```

Tests are colocated in `src/` next to the utility they cover.

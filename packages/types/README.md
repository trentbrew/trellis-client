# `@turtle.tech/types`

Shared TypeScript types for the Trellis monorepo.

> **Status: scaffold.** `src/index.ts` is currently a placeholder. This package exists so that genuinely cross-cutting types have an obvious home when they appear.

---

## When to put a type here

Add a type to this package only if **all** of the following hold:

1. The type is needed in **two or more** workspace packages.
2. It does not depend on a specific package's runtime (no Vue, no Nuxt, no SQLite).
3. It is stable enough that pinning a version makes sense (rarely true for in-development types — prefer a domain-package home until the shape settles).

Otherwise:

- **Frontend-only types** → `apps/web/app/types/`
- **TQL kernel types** → `packages/tql/` (re-exported from `index.ts`)
- **MCP-only types** → `packages/trellis-mcp/src/`
- **CLI-only types** → `packages/trellis-cli/src/`

---

## Usage

```ts
import type { /* ... */ } from '@turtle.tech/types'
```

The package is workspace-internal (`"private": true`); never publish it.

---

## Adding a new type

1. Add it to `src/index.ts` with a JSDoc comment.
2. Add the consuming workspace as needed (`pnpm install` after editing `package.json`).
3. Run `pnpm --filter @turtle.tech/types typecheck` to verify.

# Executor gate — web verification ladder

## Purpose

Executor gate for `apps/web`: lint + unit tests + route validation must pass before review handoff.

## Commands

```bash
cd apps/web && pnpm check
curl -sf http://localhost:1414/api/graph/health
```

## Notes

- `pnpm check` = `pnpm lint && vitest run && tsx scripts/validate-routes.ts`
- Color-mode helper is stubbed in `apps/web/vitest.setup.ts` for Nuxt vitest env.
- Bin shims under `apps/web/node_modules/.bin/{eslint,vitest,tsx}` bridge bun-linked installs.

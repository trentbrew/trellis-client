# Spec: Phase 6 (partial) — CI grep gate for `@turtle.tech/tql` imports

**VCS:** TRL-9 (spec) · **Impl:** TRL-10 · **Parent proposal:** TRL-5  
**ADR:** `docs/architecture/adr-001-tql-to-trellis-rename.md` (Phase 6 partial)  
**Epic ref:** `WU-TQL-TRELLIS-001-spec.md` Phase 6 (CI gate AC only)  
**Prerequisite:** Phase 3 shipped (`8041d0b`), Phase 4 shipped (`8ba7ac6`)  
**Status:** queue → executor

---

## Problem

Phase 3 moved canonical imports to `@turtle.tech/trellis-kernel`. The deprecated shim `packages/tql/` (`@turtle.tech/tql`) must remain the **only** place that name appears in runtime code. Without a gate, new imports can regress the rename silently.

**Out of scope for this wedge:** full `AGENTS.md` / `ARCHITECTURE.md` doc sweep (separate follow-up).

---

## Scope

### In scope

| Area | Action |
|------|--------|
| `scripts/check-kernel-imports.mjs` | Fail on `@turtle.tech/tql` outside allowlist |
| Root `package.json` | `"check:kernel-imports"` script |
| `justfile` | `check-kernel-imports` recipe |
| `packages/tql/README.md` | Short deprecation notice + removal target |
| Self-test | Script exits 0 on current tree |

### Allowlist (only legal occurrences)

| Path | Allowed pattern |
|------|-----------------|
| `packages/tql/package.json` | `"name": "@turtle.tech/tql"` |
| `packages/tql/**/*.ts` | Re-exports from `@turtle.tech/trellis-kernel` only |
| `docs/**`, `.agent/**`, `living-docs/**` | Historical references (not scanned) |

### Scan targets

- `**/*.{ts,mts,mjs,vue}` under repo root
- `**/package.json` (workspace deps) — fail if `"@turtle.tech/tql"` dependency outside `packages/tql/`

### Exclusions from scan

```
node_modules/**  dist/**  .nuxt/**  .output/**  **/node_modules/**
packages/tql/**  (allowlisted)
docs/**  .agent/**  living-docs/**
```

---

## Script contract

```bash
node scripts/check-kernel-imports.mjs          # exit 0 = pass, 1 = violations
node scripts/check-kernel-imports.mjs --verbose
```

**On failure:** print each `file:line` with the match; stderr summary count; exit 1.

**On pass:** print `[check-kernel-imports] OK — no disallowed @turtle.tech/tql imports`; exit 0.

Implementation: Node `fs` walk or `rg` spawn — prefer **zero new deps**; `rg` if available, else simple recursive walk.

---

## Deprecation notice

Add `packages/tql/README.md`:

```markdown
# @turtle.tech/tql (deprecated)

Re-export shim for `@turtle.tech/trellis-kernel`. **Removal target: 2026-09-01** (ADR-001 Phase 6).
New code must use `@turtle.tech/trellis-kernel`.
```

---

## Acceptance criteria

- [ ] `scripts/check-kernel-imports.mjs` exists and exits 0 on current `local-trellis`
- [ ] Injecting `import x from '@turtle.tech/tql'` in `apps/web/foo.ts` causes exit 1
- [ ] `packages/tql/package.json` name `@turtle.tech/tql` does not fail
- [ ] Root `package.json` has `"check:kernel-imports"` script
- [ ] `just check-kernel-imports` runs the script
- [ ] `packages/tql/README.md` documents removal target date

---

## Test plan

```bash
node scripts/check-kernel-imports.mjs
just check-kernel-imports
# Manual negative test:
# echo "import '@turtle.tech/tql'" >> /tmp probe.ts — must fail when pointed at script
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| False positives in docs | Exclude doc paths from scan |
| `rg` not installed in CI | Fallback walk in script |
| Over-broad package.json scan | Allowlist only `packages/tql/package.json` name field |

---

## Handoff

Small focused commit on `local-trellis`. No behavior change — guardrail only. Full Phase 6 doc sweep remains a future proposal.

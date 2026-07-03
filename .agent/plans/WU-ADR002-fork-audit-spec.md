# Spec: ADR-002 fork file audit — `packages/trellis-kernel` vs `trellis@3.2`

**VCS:** TRL-18 (spec) · parent TRL-12 (epic)  
**Proposal:** `.agent/plans/WU-ADR002-fork-audit-proposal.md`  
**ADR:** `docs/architecture/adr-002-graph-derived-client-realtime-convergence.md` (D1) · `docs/architecture/adr-002-kernel-divergence-audit.md` §4  
**Builds on:** TRL-16 · TRL-17 (client read path converged)  
**Compared versions:** `@turtle.tech/trellis-kernel` (monorepo `packages/trellis-kernel/`) vs `trellis@^3.2` (lockfile: `apps/web` → 3.2.x)  
**Status:** queue-ready

---

## Problem

Client read convergence (config + browse) is shipped on kernel-bridge. The **server still runs the embedded fork** (`TrellisKernel`, EQL-S, workflows, formulas). Without a file-level audit, port decisions are guesswork and risk duplicating npm work or deleting still-used fork code.

## Goal

Deliver **`docs/architecture/adr-002-kernel-fork-file-audit.md`** — authoritative inventory + verdict table + import-usage map + prioritized port queue.

## Non-goals

- Code ports, dependency swaps, or deleting `packages/trellis-kernel`
- Full semantic diff of every function
- turtleOS kernel comparison
- P2 zone-gated relay (blocked on SPEC-v1.1)
- E2e or runtime verification

---

## Methodology

### A — Embedded inventory

Enumerate all `*.ts` / `*.tsx` under `packages/trellis-kernel/` grouped by top-level module:

| Module | Path | Notes |
|--------|------|-------|
| store | `store/` | EAVStore |
| persist | `persist/` | jsonl, sqlite, better-sqlite backends |
| kernel | `kernel/` | TrellisKernel, middleware, workspace, ontology |
| query | `query/` | EQL-S parser, optimizer, evaluator, generator |
| graph | `graph/` | engine, executors, tools, InkLogger |
| computation | `computation/` | formula + expr evaluators |
| workflows | `workflows/` | parser, planner, engine, runners |
| analytics | `analytics/` | insights engine, dataset analyzer |
| cli | `cli/` | tql REPL, insights, query-gen (fork-internal) |

Per file record: **path**, **~LOC**, **primary exports**, **brief purpose** (one line).

### B — Published `trellis` map

From `apps/web/node_modules/trellis/package.json` exports + `dist/` layout, map npm subpaths:

- `trellis/core`, `trellis/db`, `trellis/schema`, `trellis/server`, `trellis/client`, `trellis/realtime`, `trellis/vcs`, `trellis/links`, `trellis/decisions`, …

For each embedded top-level module, document the **closest npm surface** or `—` (no equivalent).

Pinned compare version: read from `apps/web/package.json` lock (`trellis@^3.2.0`); record exact resolved version in audit header.

### C — Monorepo import usage

Ripgrep importers of `@turtle.tech/trellis-kernel` and deprecated `@turtle.tech/tql` re-exports across:

- `apps/web/server/**`
- `apps/web/app/**` (if any)
- `hooks/**`
- `packages/tql/**`
- `packages/trellis-cli/**` (if applicable)

Produce table: **import path** → **importer files (count)** → **runtime critical?** (yes/no + note).

### D — Structural compare (priority modules)

For these embedded paths, spot-check vs npm `trellis/core` or `trellis/db` (read types + key files; no full diff):

1. `query/query-optimizer.ts` + `query/datalog-evaluator.ts` + `query/eqls-parser.ts`
2. `workflows/*` (entire module)
3. `computation/*`
4. `analytics/*`
5. `kernel/trellis-kernel.ts` + `store/eav-store.ts` (baseline engine)

Classify each priority file:

| Class | Meaning |
|-------|---------|
| **npm-parity** | Same responsibility exists in npm; fork likely stale duplicate |
| **fork-extends** | npm has base; fork adds Trellis-client-specific behavior |
| **fork-only** | No npm equivalent in 3.2 |
| **deprecated-shim** | Only used via `packages/tql` re-export |

### E — Verdict assignment

Per file (or per file-group for tiny files), assign:

| Verdict | When |
|---------|------|
| **port** | Replace with npm API in a future wedge; fork can retire after |
| **keep embedded** | Nuxt/platform-specific; no npm home in 3.2 |
| **upstream** | Generic improvement; propose PR to trellis-node |
| **drop** | Unused in monorepo; safe to delete later |
| **defer** | Needs SPEC-v1.1 or P2 before decision |

### F — Port queue (output section)

End artifact with **Recommended next 3 wedges** (titles + 1-line scope + blocked-by). Example shape:

1. Query engine — retire embedded EQL-S if npm `trellis/core` query parity proven
2. Workflows — keep embedded vs upstream YAML engine decision
3. Ontology listing — post-browse: `kernel.listOntologies()` → schema registry

Must include explicit **P2 zone-gated relay** as blocked with reason.

---

## Deliverable structure

`docs/architecture/adr-002-kernel-fork-file-audit.md` must contain:

1. **Header** — date, embedded path, npm version, author agent
2. **Executive summary** — file counts, verdict totals, top 5 findings
3. **Module overview table** — embedded module → npm mapping → aggregate verdict
4. **File inventory table** — all `packages/trellis-kernel/**` source files
5. **Import usage table** — monorepo dependents
6. **Priority deep-dives** — query, workflows, computation, analytics (subsection each)
7. **Port queue** — next 3 wedges with TRL-sized titles
8. **Appendix** — commands used to regenerate inventory

Update `docs/architecture/adr-002-kernel-divergence-audit.md` §4:

```markdown
4. ~~**File-by-file fork audit** — …~~ **Shipped TRL-18** (see `adr-002-kernel-fork-file-audit.md`).
```

---

## Implementation slices (executor order)

### Slice 1 — Inventory script or manual table

| File | Action |
|------|--------|
| `scripts/audit-kernel-fork-inventory.mjs` | **Optional** — walk `packages/trellis-kernel`, emit markdown table rows |
| `docs/architecture/adr-002-kernel-fork-file-audit.md` | **New** — skeleton + header + module overview |

### Slice 2 — npm map + import usage

| File | Action |
|------|--------|
| `docs/architecture/adr-002-kernel-fork-file-audit.md` | Add npm subpath map section |
| same | Add `rg '@turtle.tech/trellis-kernel'` usage table |

### Slice 3 — Priority deep-dives + verdicts

| File | Action |
|------|--------|
| `docs/architecture/adr-002-kernel-fork-file-audit.md` | Complete file inventory with verdict column |
| same | Query / workflows / computation / analytics subsections |

### Slice 4 — Port queue + divergence audit link

| File | Action |
|------|--------|
| `docs/architecture/adr-002-kernel-fork-file-audit.md` | Port queue + executive summary |
| `docs/architecture/adr-002-kernel-divergence-audit.md` | Mark §4 shipped, link audit doc |

---

## Acceptance criteria

1. **Artifact exists:** `docs/architecture/adr-002-kernel-fork-file-audit.md` ≥ 150 lines, all 8 sections present
2. **Coverage:** every `*.ts` file under `packages/trellis-kernel/` appears in file inventory (cli tsx optional note)
3. **Verdicts:** 100% of inventory rows have a verdict; priority modules (query, workflows, computation, analytics) each have ≥1 paragraph rationale
4. **Import usage:** table lists ≥5 distinct import paths with importer counts (or documents "only N paths" if fewer)
5. **npm version:** resolved `trellis` version recorded from lockfile/node_modules
6. **Port queue:** exactly 3 numbered wedge recommendations; P2 relay listed as blocked
7. **Divergence audit:** §4 updated with shipped link
8. **No runtime changes:** `git diff` touches only `docs/**` and optional `scripts/audit-kernel-fork-inventory.mjs`

**Verification commands:**

```bash
# Section presence
rg -n "^## " docs/architecture/adr-002-kernel-fork-file-audit.md

# Full file coverage (count embedded ts files vs table rows — document counts in AC summary)
find packages/trellis-kernel -name '*.ts' | wc -l

# Import paths captured
rg -l '@turtle.tech/trellis-kernel' apps/web hooks packages --glob '*.{ts,vue,mjs}' | wc -l

# Docs-only diff
git diff --stat
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| npm `dist/` is bundled — hard to 1:1 file map | Map by **module responsibility**, not filename |
| Audit stale on next npm bump | Pin version in header; note regen command |
| Over-scoping into port impl | Spec is docs-only; ports become TRL-19+ proposals |
| `packages/tql` shim confusion | Tag `deprecated-shim` rows explicitly |

---

## Handoff

```bash
trellis issue start TRL-18
trellis issue create -t "Impl: ADR-002 kernel fork file audit" -l impl --parent TRL-18 -S queue
```

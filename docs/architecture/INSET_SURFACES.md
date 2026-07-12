# Inset surface hierarchy

**Status:** Shipped (2026-07) — **substrate layer**, not the fractal presentation model  
**Source of truth:** `apps/web/app/assets/css/tailwind.css` (`--surface-*`, `@theme` colors)

Campus shell uses a **containment-first chromatic ladder**: opaque surfaces that lift in discrete steps from `--background`. Sticky chrome (browse toolbars, database headers) must share the **same token** as the scroll surface behind it.

This doc governs **where** chrome sits in the inset stack and **how** it matches visually. It does **not** define **how** projections morph, disclose fields, or crossfade — that is [Fractal Responsiveness](#relationship-to-fractal-responsiveness) (separate axis, not yet shipped as a continuous system).

---

## Positioning: substrate vs fractal

Trellis has two UI depth concepts that are easy to conflate:

| Axis | Question it answers | Mechanism | Status |
| ---- | ------------------- | --------- | ------ |
| **Inset surfaces** | *Where am I in the campus container?* | Discrete `surface-1 → 2 → 3` chromatic steps | **Shipped** — use for shell, layout, sticky chrome |
| **Fractal vantage** | *How much of this projection is revealed?* | Continuous `--vantage`, dual-shell crossfade, field disclosure, ghost proxies | **North star** — discrete route vantages in decks/sheets; full continuous morph deferred ([ADR-001 D7](./adr-001-tql-to-trellis-rename.md)) |

**Surfaces are not a replacement for fractal.** They solve a different problem: opaque theme-derived backgrounds when content scrolls under sticky headers. Fractal solves presentation scale on a single projection surface.

**Surfaces are still worth keeping.** Every shipped page needs a substrate whether or not vantage morph exists. Browse, collections, and campus shell all live here today.

**Practical rule for agents:** use `bg-surface-*` for structural chrome and scroll containers; reserve fractal/`--vantage` patterns for projection interiors (decks, sheets, future morph surfaces). Do not expect surfaces to morph — and do not use `card/50` blur hacks because fractal isn't here yet.

---

## Relationship to Fractal Responsiveness

Fractal Responsiveness (21 vantage levels, `--vantage` CSS, dual-shell crossfade) is the **presentation contract** for schema-driven projections: one component, many reveal levels.

Inset surfaces are the **spatial chromatic contract** for the campus shell wrapping those projections.

```
┌─ Campus shell (inset surfaces) ─────────────────────────┐
│  background → surface-1 → surface-2 (main + toolbar)   │
│  ┌─ Projection host (fractal vantage — when applicable) ┐│
│  │  same SlideCanvas / SheetGrid at data-vantage=N     ││
│  │  field disclosure · crossfade · ghost proxies         ││
│  └─────────────────────────────────────────────────────┘│
│       surface-3 / card — entity cards, panels            │
└──────────────────────────────────────────────────────────┘
```

**What fractal does not solve:** sticky toolbar color matching, theme-derived opaque fills, nested inset frames. Surfaces stay even when fractal lands.

**What surfaces do not solve:** continuous zoom between thumb/editor/present, progressive field disclosure, viewport-driven layout morph. Do not fake fractal with extra surface steps.

**Convergence (future, not designed):** vantage ranges might *modulate* disclosure and motion on top of a fixed `surface-2` host — not replace the substrate ladder. Any merge gets its own ADR.

---

## Problem: `bg-card/50` cannot match sticky chrome

`bg-card/50` is `color-mix(card 50%, transparent)`. It only looks correct when composited over a known parent (usually `--background`). That causes two failures:

1. **Nested layers** — e.g. `card/50` on `card/50` in `default.vue` mode A produced a color no single opaque value could reproduce.
2. **Sticky toolbars** — content scrolls beneath the toolbar. An opaque bar using `color-mix(card 50%, background)` still mismatches when the visible stack is deeper than one layer. A transparent bar with `backdrop-blur` reads as frosted glass, not as part of the workspace.

**Rule:** Do not use `bg-card/50` for main content shells or sticky chrome. Use `bg-surface-*` instead.

---

## Surface tokens

Three **derived, opaque** CSS variables sit between `--background` and `--card`:

| Token | Definition | Tailwind | Role |
| ----- | ---------- | -------- | ---- |
| `--surface-1` | `color-mix(card 25%, background)` | `bg-surface-1` | Outer inset frame (layout shell border box) |
| `--surface-2` | `color-mix(card 50%, background)` | `bg-surface-2` | **Main scroll area**, browse/database toolbars, split-pane headers |
| `--surface-3` | `var(--card)` | `bg-surface-3` | Cards, panels, popovers — same as `bg-card` |

Defined once on `:root` in `tailwind.css`:

```css
:root {
  --surface-1: color-mix(in oklch, var(--card) 25%, var(--background));
  --surface-2: color-mix(in oklch, var(--card) 50%, var(--background));
  --surface-3: var(--card);
}
```

Registered for Tailwind v4:

```css
@theme inline {
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
}
```

### Theme presets

Surface tokens are **not** stored per preset in `theme-presets.ts`. They recompute automatically when a preset overrides `--card` or `--background` (including runtime injection from `applyThemeStyles`).

Only edit `card` and `background` in presets; surfaces follow.

---

## Visual stack

```
--background          App root (layouts/default.vue)
  └─ surface-1        Outer inset frame (mode A shell)
       └─ surface-2   Main content + sticky toolbars  ← same token
            └─ surface-3 / card   Entity cards, dialogs, elevated panels
```

**Layout mode A** (`headerAboveSidebar`): `bg-surface-1` on the bordered shell, `bg-surface-2` on `<main class="page-transition-wrapper">`.

**Layout mode B** (default): `bg-surface-2` on `<main>` directly.

**Browse toolbar** (`Page.vue`, `variant="browse"`): sticky row uses `bg-surface-2` — identical to the scroll surface, opaque when content passes underneath.

---

## Usage guide

| Need | Use | Avoid |
| ---- | --- | ----- |
| Main page / scroll container | `bg-surface-2` | `bg-card/50` |
| Sticky toolbar, table header, split header | `bg-surface-2` | `backdrop-blur`, `bg-card/50`, `bg-surface-2-solid` |
| Outer campus inset frame | `bg-surface-1` | Double-stacked `card/50` |
| Cards, modals, inputs on surface | `bg-card` / `bg-surface-3` | — |
| Subtle control well inside toolbar | `bg-muted/30` or `bg-card` | `bg-card/0 backdrop-blur-*` |
| Intentional glass overlay (rare) | `bg-card/50 backdrop-blur-*` | Using this for structural chrome |

### Examples

```vue
<!-- Main content shell (layout) -->
<main class="page-transition-wrapper bg-surface-2 …" />

<!-- Browse / database sticky toolbar -->
<div class="sticky z-40 bg-surface-2 …">…</div>

<!-- Database toolbar component -->
<div class="border-b border-border bg-surface-2 …">…</div>
```

---

## Migration

When touching legacy chrome, prefer this replacement map:

| Legacy | Replacement |
| ------ | ----------- |
| `bg-card/50` on shells / toolbars | `bg-surface-2` |
| `bg-card/50` on outer inset frame | `bg-surface-1` |
| `bg-surface-2-solid` (removed) | `bg-surface-2` |
| Custom `.bg-surface-*` utilities with `transparent` mix | `bg-surface-*` Tailwind colors |

`bg-card/50` remains valid for **decorative** translucent overlays (e.g. hover states, empty-state panels) where scroll bleed and sticky matching are not concerns.

---

## Related files

| File | Purpose |
| ---- | ------- |
| `apps/web/app/assets/css/tailwind.css` | Token definitions + `@theme` registration |
| `apps/web/theme-presets.ts` | Preset `card` / `background` only (surfaces derived) |
| `apps/web/app/layouts/default.vue` | Shell `surface-1` + `surface-2` wiring |
| `apps/web/app/components/layout/Page.vue` | Browse toolbar `bg-surface-2` |
| `apps/web/app/components/data/DatabaseToolbar.vue` | Reference toolbar pattern |
| `docs/implementation/THEMING.md` | Theme engine overview (links here) |

---

## Agent checklist

When adding or restyling **campus shell / workspace chrome** (not projection interiors):

1. Identify the scroll surface — almost always `bg-surface-2`.
2. Put sticky headers/toolbars on **`bg-surface-2`**, not `card/50` or blur.
3. Elevate interactive panels one step to `bg-card` / `bg-surface-3`.
4. Do not add new opacity-based surface hacks; extend this token ladder if a fourth depth is needed.
5. For deck/sheet/projection **vantage** behavior, follow fractal artifacts — do not conflate with surface tokens.

**Not the fractal checklist.** Vantage crossfade, field disclosure, and ghost proxies live in projection-specific specs (`deck_p1_*`, `sheets_decks_*`, future TRL-9).

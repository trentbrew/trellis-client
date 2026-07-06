# Spec: Campus Shell Chrome — Wedge B (Dock polish — NOT resident relocation)

> ## ⛔ CANCELLED: dock-mount resident cluster
>
> **Human decision (2026-07-06):** `AccountRailCluster` stays in **`AppHeader` top-right** (`placement="header"`).  
> **Agents: ignore every instruction below that mounts the cluster on `IconRail`.**  
> In-scope for Wedge B: zone group separators, dock accent pills, `RailZoneSeparator` — only.

**Parent:** [campus_shell_chrome_design.md](./campus_shell_chrome_design.md)  
**Depends on:** [campus_shell_chrome_p0a_spec.md](./campus_shell_chrome_p0a_spec.md) (Wedge A — shipped)  
**Baseline:** `CampusContextBreadcrumb`, `AppMenubar`, **`AccountRailCluster` in `AppHeader` right** (not `IconRail`) — **do not regress**  
**VCS:** Create `TRL-*` spec issue when promoting to lane  
**Executor lane:** `agent:cursor` (or active dev lane)  
**Label:** `needs-e2e` (dock regression surface)

---

## Problem

Wedge A moved the **sky layer** (menubar) out of the header center, but the **ground layer** is incomplete: `NotificationBell` and the avatar menu still live in `AppHeader` right, competing with menubar density. Dock center routes are a flat list with no zone grouping; active pills do not tint with `--campus-zone-accent` (tokens landed in Wedge A but only apply to menubar separators today).

## Goal (superseded — see design baseline 2026-07-06)

> **Production decision:** Resident cluster stays in **`AppHeader` top-right** (after menubar). Wedge B dock-mount goal below is **not** current target. E2E: `campus-dock-resident.spec.ts`.

1. ~~Extract **`AccountRailCluster`** into `IconRail` right zone~~ — **reverted:** header placement.
2. **`AppHeader` right** — menubar + **`AccountRailCluster`** + contextual collection/cloud chrome.
3. Add **zone group separators** in dock center navigation.
4. Apply **zone-accent tint** to active dock pills.

## Non-goals (this wedge)

- Expandable graph URI on breadcrumb (Wedge C)
- Moving cloud collaboration strip (members avatars, Invite) — stays in header
- Collapsible dock zone sections
- Left-rail layout redesign beyond mirroring cluster at column bottom
- Removing `Local` from breadcrumb (dock gets a **compact** mode badge; breadcrumb root segment stays)
- Tauri `get_system_stats` (Wedge A.1 follow-up)

---

## Layout (target)

### Header right (production)

```
[AppMenubar] [AccountRailCluster: bell · avatar · + · capture] [collection save?] [cloud members?] [invite?]
```

### Dock (bottom rail — navigation only)

```
[Chat] │ [Graph] │ ─Lab─ │ …routes… │ ─Show─ │ …routes… │ ─Vault─ │ …
```

**No resident cluster on dock.** ~~`[Local][🔔][👤][+][✎]`~~ — cancelled.

**Accept shipped deviation:** Chat left column only; Graph remains first in center group (design mock showed both left — do not move Graph in this wedge).

### Resident cluster order (L→R)

`AdapterModeBadge` · `NotificationBell` · `UserAccountMenu` · `QuickCreateButton` · `QuickCapturePopover`

Matches design §Resident cluster semantics. `+` and `✎` already on rail — **reorder** to trail avatar.

---

## Components

### `AccountRailCluster.vue` (new)

`flex shrink-0 gap-1.5 items-center` — wraps Resident children. Props:

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `railPosition` | `'left' \| 'bottom'` | `'bottom'` | Passed from `IconRail` |

Mount in **`AppHeader`** with `placement="header"` — **not** `IconRail`.

### `AdapterModeBadge.vue` (new)

Compact pill for dock — icon + optional `"Local"` / `"Cloud"` label on bottom rail when active pill has label room.

| State | UI |
|-------|-----|
| Local | `lucide:hard-drive` + "Local" (hidden on narrow left rail — icon only) |
| Cloud | `lucide:cloud` + "InstantDB" or "Cloud" |

- `aria-label`: `Data mode: Local` / `Data mode: Cloud`
- Tooltip: reuse copy from `CampusContextBreadcrumb` root tooltip (entity/ontology backends, health)
- Style: `h-8` circle or pill, `rounded-full`, emerald tint for local (`text-emerald-500/80` border) per design `{colors.local-badge}`

### `UserAccountMenu.vue` (new — extract)

Extract avatar trigger + dropdown from [`AppHeader.vue`](../../apps/web/app/components/app/AppHeader.vue) (lines ~383–451).

| Prop | Type | Default |
|------|------|---------|
| `placement` | `'header' \| 'rail'` | `'header'` |
| `railPosition` | `'left' \| 'bottom'` | `'bottom'` |

Behavior unchanged: profile link, edit mode toggle, sign out. Avatar `size-8` in rail placement.

**Dropdown side:** `bottom` when `placement === 'header'`; `top` when `placement === 'rail' && railPosition === 'bottom'`; `right` when left rail.

### `NotificationBell.vue` (modify)

Add props mirroring `QuickCreateButton`:

```ts
placement?: 'header' | 'rail'
railPosition?: 'left' | 'bottom'
```

| Placement | Trigger style | Menu `side` |
|-----------|---------------|-------------|
| `header` | current outline icon-sm | `bottom` (unchanged) |
| `rail` | `h-8 w-8 rounded-full` dock icon, bell `lucide:bell` | `top` when bottom rail |

- `aria-label`: `Lobby — notifications`
- Tooltip: `Lobby — notifications` (+ unread count when > 0)
- Unread badge styling unchanged

### `IconRail.vue` (modify)

#### ~~Right zone — CANCELLED~~

~~Mount `AccountRailCluster` on dock~~ — **do not**. Resident cluster is in `AppHeader` only.

#### Center zone — zone grouping

Add helper (prefer colocated export from [`campus-zones.ts`](../../apps/web/app/lib/campus-zones.ts)):

```ts
/** Resolve campus zone kind for a route path (workspace prefix stripped). */
export function campusZoneKindForPath(path: string): CampusZoneKind
```

Implementation: delegate to the same rules as [`useZoneContext.ts`](../../apps/web/app/composables/useZoneContext.ts) `ROUTE_RULES` (extract shared `zoneKindForPathname()` to avoid drift, or import from a new `~/lib/campus-zone-routes.ts` mirrored once).

**Group `otherPrimaryRoutes`** by `campusZoneKindForPath(route.path)`.

**Render order** (center groups, after Graph):

1. `lab`
2. `workshop` (if any primary routes map here — unlikely in P0 rail config)
3. `showroom`
4. `vault`

Omit empty groups. **Graph** stays in its own slot before grouped routes (unchanged).

Insert `RailZoneSeparator` between groups (not before first group).

#### `RailZoneSeparator.vue` (new)

```html
<span class="rail-zone-sep w-px h-5 shrink-0 opacity-30 bg-border menubar-sep-accent" aria-hidden="true" />
```

Reuse `.menubar-sep-accent` for zone-tinted separator (already in `tailwind.css`).

### `RailNavItem.vue` (modify)

Add optional prop `zoneKind?: CampusZoneKind`.

When `isActive && isBottom`, apply class `rail-nav-active-zone`:

```css
/* tailwind.css */
.rail-nav-active-zone {
  background: color-mix(in oklch, var(--campus-zone-accent, var(--muted)) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--campus-zone-accent, var(--border)) 24%, transparent);
}
```

Pass `zoneKind` from `campusZoneKindForPath(route.path)` in `IconRail`.

### `AppHeader.vue` (modify)

- **Keep** `AccountRailCluster` with `placement="header"` after `AppMenubar`.
- **Keep:** `AppMenubar`, collection save status, `showCloudCollaborationControls` (members, invite), `MemberInviteDialog`.

### `QuickCreateButton.vue` / `QuickCapturePopover.vue`

No API changes required — consumed inside `AccountRailCluster` with `placement="header"`.

---

## CSS

Add to [`apps/web/app/assets/css/tailwind.css`](../../apps/web/app/assets/css/tailwind.css):

```css
.rail-nav-active-zone { /* see RailNavItem */ }
.rail-resident-btn { /* shared h-8 w-8 rounded-full dock control */ }
```

Zone accent tokens (`[data-campus-zone='…']`) already exist from Wedge A — **wire to dock**, do not duplicate.

---

## Accessibility

| Control | `aria-label` |
|---------|--------------|
| AdapterModeBadge | `Data mode: Local` / `Data mode: Cloud` |
| NotificationBell (rail) | `Lobby — notifications` |
| UserAccountMenu | `Resident menu` |
| QuickCreate (rail) | existing / `Furnish` tooltip |
| QuickCapture (rail) | existing / `Capture` tooltip |

Keyboard: existing shortcuts unchanged (`⌘K`, `⌘⇧N` capture).

---

## Acceptance criteria (dock polish only — resident relocation cancelled)

1. **`AccountRailCluster` in `AppHeader`** with `placement="header"` — bell, avatar, +, capture visible in header right.
2. **`AccountRailCluster` absent from `IconRail`** — dock is navigation only.
3. **Zone separators** visible between distinct zone groups in dock center when ≥2 groups have routes.
4. **Active dock pill** uses `rail-nav-active-zone` tint derived from route's zone kind.
5. **`AppMenubar` + `CampusContextBreadcrumb` unchanged** — no regressions.
6. **Cloud collaboration controls** (member stack, Invite) **remain in header** when `isCloud`.
13. **Left rail position** — cluster stacks at bottom of column; dropdowns open `right` / `bottom` per existing rail patterns.
14. **Tauri** — dock controls are `app-region-no-drag` (inherit from rail; no new drag regressions).
15. **Manual:** bottom dock at 1280px — no horizontal overflow; header right noticeably slimmer than pre-B.
16. **Lint:** no new errors in touched files (`ReadLints` clean on touch list).

### E2E

```bash
PW_REUSE=1 pnpm test:e2e e2e/campus-dock-resident.spec.ts
```

New spec (minimum):

- Menubar still visible (`navigation[aria-label="Facility sky"]`)
- Bell present in dock, absent from header (`data-slot="app-header"` has no bell button)
- Click bell → dropdown opens
- Avatar present in dock; click → menu with "Profile settings" or "Sign out"
- `+` opens create menu (smoke: menu visible)

---

## File touch list

| Action | Path |
|--------|------|
| New | `app/components/app/AccountRailCluster.vue` |
| New | `app/components/app/AdapterModeBadge.vue` |
| New | `app/components/app/UserAccountMenu.vue` |
| New | `app/components/layout/RailZoneSeparator.vue` |
| New | `app/lib/campus-zone-routes.ts` (or extend `campus-zones.ts`) |
| New | `tests/e2e/campus-dock-resident.spec.ts` |
| Modify | `app/components/layout/IconRail.vue` |
| Modify | `app/components/layout/RailNavItem.vue` |
| Modify | `app/components/app/AppHeader.vue` |
| Modify | `app/components/notifications/NotificationBell.vue` |
| Modify | `app/assets/css/tailwind.css` |
| Modify | `app/layouts/default.vue` — update stale omnibox comment |
| Modify | `app/layouts/fullscreen.vue` — same comment fix |

**Do not modify:** `CampusContextBreadcrumb.vue`, `AppMenubar.vue`, menubar children, `AppOmnibox.vue` (unless import-only).

---

## Open decisions (defaults for Executor)

| Question | Default |
|----------|---------|
| Local badge vs breadcrumb duplication | Ship compact dock badge; breadcrumb `Local` segment stays |
| Graph placement | Keep center (shipped deviation) |
| Zone group labels (`─Lab─`) | Separators only in P0 — no text labels |
| Collections zone | `showroom` per `zone-router` (group with Pages) |
| `/graph`, `/home` zone for tint | `workshop` for tint purposes when active |
| Header without authenticated user | No rail → no cluster; menubar may still show (Wedge A behavior) |

---

## Wedge C preview (out of scope)

Last breadcrumb crumb expands to graph address (`entity:… / projection:…`) with copy-on-click.

---

## Verification commands

```bash
# Per-file lint (repo baseline may still fail globally)
pnpm --filter ./apps/web exec eslint app/components/app/AccountRailCluster.vue app/components/app/AppHeader.vue app/components/layout/IconRail.vue

PW_REUSE=1 pnpm --filter ./apps/web test:e2e e2e/campus-dock-resident.spec.ts
```

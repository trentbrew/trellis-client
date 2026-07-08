---
version: alpha
name: Document Chrome — seamless title + AI summary in properties
description: Design artifact for document-chrome wedge — notes and pages read as one continuous surface; machine summary lives in properties sidebar only
source:
  tool: greenfield
  mock: docs/artifacts/document_chrome_mockup.html
  parentProposal: document-chrome
colors:
  background: "#0a0a0c"
  surface: "#141418"
  surface-2: "#1a1a21"
  text: "#e8e8ec"
  text-muted: "#888894"
  text-faint: "#55555f"
  border: "#2a2a32"
  primary: "#6366f1"
  ai-accent: "#a78bfa"
  note-badge: "#f59e0b"
  page-badge: "#8b5cf6"
  saved: "#34d399"
typography:
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  docTitle:
    fontFamily: IBM Plex Sans
    fontSize: clamp(28px, 4vw, 36px)
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  docBodyH2:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  propertiesLabel:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  propertiesValue:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  docColumnMax: 720px
  docPaddingX: 32px
  docTitleBottom: 20px
  bodyTop: 0px
  chromeGap: 12px
components:
  DocumentTitleField:
    fontSize: "{typography.docTitle.fontSize}"
    fontWeight: "{typography.docTitle.fontWeight}"
    border: none
    background: transparent
    hoverChrome: none
    focusRing: "2px solid color-mix(in oklch, {colors.primary} 35%, transparent)"
    placeholderColor: "{colors.text-faint}"
  DocumentBodyColumn:
    maxWidth: "{spacing.docColumnMax}"
    paddingX: "{spacing.docPaddingX}"
    borderTop: none
  PropertiesSummaryRow:
    icon: lucide:sparkles
    accentColor: "{colors.ai-accent}"
    regenerateIcon: lucide:refresh-cw
    readOnly: true
  EntityDialogChrome:
    badgesRow: sticky
    titleZone: inScrollBody
    descriptionInBody: false
---

# Design: Document Chrome — seamless title + AI summary in properties

**Status:** Design complete (handoff to Architect)  
**Parent proposal:** document-chrome  
**Mock:** [document_chrome_mockup.html](./document_chrome_mockup.html)  
**Touches:** `EntityBodyHeader.vue`, `EntityDialog.vue`, `pages/[id].vue`, `useEntitySummary.ts`, `OntologyPropertiesTab.vue` (or new `DocumentPropertiesTab.vue`)

---

## Overview

Notes and pages currently split **metadata chrome** from **document body** — title uses form-input hover borders, `EntityBodyHeader` draws a hard `border-b`, and a hand-editable description sits between title and content. Users experience two documents: an app header and a writing surface.

This wedge unifies the **reading column** into one continuous document while moving **machine-readable blurbs** to the properties sidebar.

### Goals

1. **Title feels like document H1** — same type scale, column width, and padding as body; no input chrome at rest
2. **No description in reading column** for `note` and `page` entity types
3. **AI summary in properties** — read-only `summary` field sourced from `content` (not `description`), with regenerate affordance
4. **Parity** — note dialog (`EntityDialog`) and full-page route (`pages/[id].vue`) share one visual language

### Non-goals (defer)

- Notion-style title-as-first-TipTap-block (separate wedge; highest seamlessness, highest cost)
- Auto-promote quick-note placeholder title from first H1 (optional P1.1 stretch)
- Changing summary behavior for tasks, people, emails, bookmarks (each keeps current pattern)

### Surfaces in scope

| Surface | Route / shell | Change |
| ------- | ------------- | ------ |
| Note dialog | `EntityDialog` + `EntityBodyHeader` | Seamless title; drop inline description |
| Page editor | `pages/[id].vue` | Same column + title treatment; drop header description |
| Properties | `EntityRightSidebar` → Properties tab | Add **Summary** row (AI) for note + page |

---

## Colors

Inherit Trellis dark shell tokens — no palette fork.

| Token | Usage |
| ----- | ----- |
| `{colors.text}` | Document title + body |
| `{colors.text-muted}` | Properties values, generating placeholder |
| `{colors.text-faint}` | Title placeholder ("Untitled", "New page") |
| `{colors.ai-accent}` | Sparkles icon on Summary row; subtle left border on summary block |
| `{colors.border}` | Dialog chrome dividers only — **not** between title and body |
| `{colors.saved}` | Footer save indicator (unchanged) |

---

## Typography

### Document title (normative)

Match editor H1 scale — **not** the current `text-2xl font-semibold` input.

| Property | Value | Maps to |
| -------- | ----- | ------- |
| Size | `clamp(28px, 4vw, 36px)` | `prose-h1` / TipTap heading level 1 |
| Weight | 700 | `font-bold` |
| Tracking | `-0.02em` | `tracking-tight` |
| Line height | 1.15 | tight display heading |

### Body (unchanged)

Editor body stays `prose-sm` with H2 at ~20px / 600 — title remains visually dominant.

### Properties Summary

- Label: `{typography.propertiesLabel}` — "SUMMARY" with sparkles icon
- Value: `{typography.propertiesValue}` — 2–3 sentences, `text-muted-foreground`
- Meta line: 10px mono — "Generated · 2m ago" or "Summarizing…"

---

## Layout

### Unified document column

```
┌─ Dialog chrome (sticky, border-b) ─────────────────────────────────────┐
│ [Note] [Pin] [#quicknote] …                    [↑][↓][×]             │
└──────────────────────────────────────────────────────────────────────┘
┌─ Scroll body ───────────────────────────────────┬─ Properties sidebar ─┐
│  max-w-[720px] mx-auto px-8                     │ PROPERTIES │ REFS   │
│                                                 │                        │
│  The Architecture of Attention…  ← H1 title   │ OWNER …                │
│  (no border below)                              │ CATEGORY …             │
│                                                 │ ┌ SUMMARY ───────────┐ │
│  Introduction                                   │ │ ✨ AI-generated    │ │
│  Paragraph text…                                │ │ 1–3 sentence blurb │ │
│                                                 │ │ [↻ Regenerate]     │ │
│  ## The Birth of Alarm Discipline               │ └────────────────────┘ │
│  …                                              │ CREATED AT …           │
│                                                 │                        │
└─────────────────────────────────────────────────┴────────────────────────┘
┌─ Footer ─────────────────────────────────────────────────────────────┐
│ ID: …                          Last saved ✓ ···                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Key layout rules**

1. **Single scroll container** — title scrolls with body (not fixed sub-header with its own border)
2. **Shared column** — title and `UiRichTextEditor` share `max-w-[720px] mx-auto px-8` (tune to match existing editor inset)
3. **No `border-b` on title zone** — remove from `EntityBodyHeader` when `variant="document"`
4. **Chrome stays chrome** — type badge, tags, nav, save status remain in sticky top bar (dialog shell / page header)
5. **Page route** — drop description `UiRichTextEditor` from header block; icon optional left of title (smaller, muted)

### Before → After (what we're fixing)

| Before | After |
| ------ | ----- |
| Title input with hover border + `bg-muted/20` | Plain text field; focus ring only |
| `border-b` under title block | No divider — body follows immediately |
| Description rich text between title and body | Removed from reading column |
| `text-2xl font-semibold` title | `text-3xl font-bold tracking-tight` (H1 parity) |
| Summary of `description` in header | Summary of `content` in properties only |
| Page: separate header `border-b` + props pill row before editor | Title in column; props pills optional below chrome or in sidebar |

---

## Elevation & Depth

- Title has **no** inset card or bordered box at rest
- Focus state: subtle ring (`ring-2 ring-primary/35`) — same family as editor focus, not form-field border
- Properties Summary block: flat row in sidebar list — optional `border-l-2 border-ai-accent/40` on value column for machine-generated affordance (subtle, not a card)

---

## Shapes

- Title field: no `rounded-md` box at rest; caret appears on focus only
- Regenerate button: icon-only `h-6 w-6` ghost, same as existing `EntityDescriptionBlock` regenerate
- Page icon button: `h-8 w-8`, muted; sits inline left of title baseline (optional — mock shows both with/without)

---

## Components

### `DocumentTitleField` (new or `EntityBodyHeader` variant)

Extract from `EntityBodyHeader` when `documentMode: true`.

| State | Appearance |
| ----- | ---------- |
| Default | Looks like H1 text — no border, no background |
| Placeholder | `text-faint`, "Untitled" / "New page" |
| Focus | Caret + focus ring; no hover border |
| View | Static `<h1>` same styles |

Props: `title`, `placeholder`, `mode`, `@update:title`. Reuse presence peer avatars from `pages/[id].vue` pattern.

### `EntityBodyHeader` — document variant

When `entityType` is `note` or `page`:

- `border-b` → **removed**
- `EntityDescriptionBlock` → **not rendered**
- Padding: `pt-8 pb-5` top of scroll column (not `px-6` divergent from body)
- Export prop: `variant: 'document' | 'default'`

### `DocumentPropertiesSummary` (new)

Sidebar row for AI summary — read-only.

```
SUMMARY                    [↻]
✨ Explores how industrial alarm
   discipline (EEMUA 191) maps
   to interface design…
Generated · 3m ago
```

- Uses existing `summary`, `isGeneratingSummary`, `@regenerate-summary` from `EntityDialog`
- `aiOnly` behavior — no rich text editor
- Empty + generating: "Summarizing…" with spinner
- Empty + short content (<120 chars): "Write more to generate a summary" (muted italic)
- Stale indicator when `summarySourceHash` ≠ hash of current content (optional P1: show "May be outdated" + regenerate)

### Page header (`pages/[id].vue`)

- Remove description block from fixed header
- Move title into scroll column OR keep in header but apply `DocumentTitleField` styles and remove `border-b` between title zone and editor
- **Recommended:** title inside scroll column with body (matches note dialog)

### `useEntitySummary` extension

| Entity type | Source field | Min length |
| ----------- | ------------ | ---------- |
| `note`, `page` | `content` (strip HTML) | 120 chars |
| all others | `description` | 120 chars (unchanged) |

Trigger: debounced on content save (notes/pages); existing watch on description for other types.

---

## Interaction matrix

| Input | Context | States | Output |
| ----- | ------- | ------ | ------ |
| Click title | note dialog / page | default → focus | Caret at end; no box chrome |
| Type in title | edit mode | focus | `entity.title` updates; autosave |
| Tab from title | — | focus | Focus moves to first body block / editor |
| Scroll | unified column | — | Title scrolls away naturally (not sticky) |
| Open note with empty description | — | — | No description placeholder in body |
| Content crosses 120 chars | note/page | — | Background `ensureSummary` from content |
| Open Properties tab | sidebar | — | Summary row visible if generated or generating |
| Click regenerate on Summary | properties | idle → generating | New `summary` persisted; spinner on icon |
| Quick note with auto-title | note | title = "Quick Note — …" | User renames title; no metadata line in body |
| View mode | dialog | — | Title as static H1; summary read-only in properties |
| Page icon click | page | — | Icon picker (unchanged); does not break title flow |

---

## Accessibility

- **Title input:** `aria-label="Document title"`; associated with dialog via `aria-labelledby` on scroll region optional
- **Focus order (note dialog):** chrome badges → title → editor → sidebar tabs → properties fields
- **Summary row:** `aria-label="AI-generated summary"`; regenerate `aria-label="Regenerate summary"`; `aria-busy` while generating
- **No focus trap** between title and editor — single tab order through document
- **Contrast:** title at `{colors.text}` on `{colors.background}` — passes WCAG AA
- **Motion:** regenerate spinner respects `prefers-reduced-motion` (static "Updating…" text fallback)

---

## Do's and Don'ts

**Do**

- Share one `documentColumn` class between note dialog and page route
- Keep type badge + tags in dialog chrome (not between title and body)
- Reuse `EntityDescriptionBlock` read-only branch for properties Summary UI
- Strip HTML from `content` before summarization
- Show summary in browse cards / graph previews via existing `summary` field

**Don't**

- Don't add description placeholder in reading column for notes/pages
- Don't let users hand-edit `summary` inline (regenerate only)
- Don't apply document variant to tasks, emails, bookmarks, people
- Don't remove `description` field from data model — other types still use it
- Don't implement title-as-TipTap-block in this wedge

---

## Open for Architect

1. **`EntityBodyHeader` API** — add `variant: 'document' | 'default'`; wire from `EntityDialog` when `type ∈ {note, page}`
2. **`DocumentTitleField.vue`** — shared component used by `EntityBodyHeader` and `pages/[id].vue`
3. **`DocumentPropertiesSummary.vue`** — sidebar row; mount in `EntityDialog` properties slot for note/page (or extend `OntologyPropertiesTab`)
4. **`useEntitySummary`** — `resolveSummarySource(entity)` → `'content' | 'description'`; strip HTML helper
5. **Page layout refactor** — title into scroll column; remove header description editor; align padding with note dialog
6. **CSS tokens** — optional `--doc-title-size` in tailwind or shared utility class `doc-title-field`
7. **E2e** — note dialog: no description field in body; title types without border class; properties shows summary after seeding long content
8. **Stretch (P1.1)** — auto-rename quick-note title from first H1 when title matches `/^Quick Note —/`
9. **Out of scope** — `DocumentDialogShell` / `workspace/pages/[pageId].vue` legacy routes unless explicitly in AC

---

## Handoff checklist

- [x] `docs/artifacts/document_chrome_design.md` (this file)
- [x] `docs/artifacts/document_chrome_mockup.html` (before/after toggle + properties Summary)
- [x] Interaction matrix complete
- [x] A11y section complete
- [x] Component anatomy mapped to existing shells
- [x] Open for Architect enumerated

---
version: alpha
name: Shared Block Embeds for Rich Text and Decks
description: Design artifact for TRL-40, defining a portable block/embed vocabulary shared by rich text flow editors and spatial deck editors.
source:
  parent: TRL-26
  proposal: TRL-40
  tool: greenfield
  mock: docs/artifacts/shared_block_embeds_mockup.html
colors:
  background: "#09090d"
  surface: "#141419"
  surface-raised: "#1b1b23"
  surface-code: "#101018"
  text: "#eceaf3"
  text-muted: "#9a94aa"
  border: "#2b2935"
  primary: "#8b5cf6"
  html: "#ff8a4c"
  mermaid: "#22d3ee"
  query: "#34d399"
  warning: "#f8c471"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: 11px
    fontWeight: 650
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, IBM Plex Mono, SFMono-Regular, ui-monospace"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.55
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 22px
  xl: 32px
motion:
  commandPreview: 120ms
  inspectorSwap: 140ms
  deckObjectSelect: 120ms
components:
  blockRegistry:
    groups: "Text Data Media Compute Presentation"
    sharedKinds: "html mermaid code queryView sheetRange entity file bookmark"
  richTextSurface:
    layout: flow
    entry: "slash-command block picker"
    editMode: inline-or-popover
  deckSurface:
    layout: spatial
    entry: "add-object palette slash-command-in-text-region"
    editMode: inspector
  htmlEmbedBlock:
    defaultSandbox: "iframe srcdoc; no scripts"
    accentColor: "{colors.html}"
  embedInspector:
    tabs: "Source Render Style Motion Safety"
---

# Design: Shared Block Embeds for Rich Text and Decks

**Status:** Design complete, handoff to Architect  
**Parent epic:** `TRL-26`  
**Proposal:** `TRL-40`  
**Mock:** [shared_block_embeds_mockup.html](./shared_block_embeds_mockup.html)

## Overview

Trellis should not grow one embed system for notes and another for decks. The design direction is a **shared block registry**: one vocabulary of embeddable objects, rendered through different authoring shells.

Rich text documents remain **flow editors**. Blocks live in the reading order, appear through slash commands, and are edited inline or through compact popovers.

Decks remain **spatial editors**. Blocks become slide objects with x/y/width/height, style, animation, and transition properties. The right inspector becomes the main editing surface for source, render options, safety, and motion.

The signature design idea is the **block cartridge**: every embed type has a compact identity strip with kind, source, safety status, and renderer health. In a document it reads like a block card. In a deck it becomes the selected object's inspector header.

## Colors

Use the existing Trellis dark workspace palette, but give embed classes distinct functional accents:

- `{colors.html}` for raw HTML, because it is powerful and needs visible safety status.
- `{colors.mermaid}` for diagrammatic/compiled output.
- `{colors.query}` for live graph-backed views.
- `{colors.warning}` only for trusted scripts, blocked content, or degraded render states.

The HTML accent should be narrow and informational, not a large warning fill. Raw HTML is a legitimate creative tool; it should feel capable, not dangerous by default.

## Typography

- Body and control labels inherit from the current shell grammar.
- Source editors use `{typography.mono}` with clear line height and soft wrapping off by default.
- Block kind labels use uppercase utility text because they act as renderer identifiers.
- User-facing commands stay sentence case: "HTML embed", "Mermaid diagram", "Code block".

## Layout

### Shared Mental Model

```text
Block registry
  kind metadata: label, icon, accent, safety, default renderer
  authoring affordances: slash command, add-object, paste/drop
  renderer contract: document flow, deck object, preview thumbnail
  config schema: source, dimensions, style, motion, safety
```

### Rich Text Flow Editor

```text
Document body
  paragraph
  / command palette
    HTML embed
    Mermaid diagram
    Code block
    Query view
    Sheet range
  block cartridge
    source/render toggle
    compact config popover
  paragraph
```

Flow blocks preserve reading order. A user can add and edit an HTML block without leaving the document context. Advanced settings should open a compact panel, not the global entity sidebar.

### Deck Spatial Editor

```text
Deck editor
  slide object palette
  stage viewport
    selected HTML object
  right inspector
    Source | Render | Style | Motion | Safety
```

Decks reuse the block renderer but add spatial properties: coordinates, size, z-order, clipping, background, fit mode, animation, and transition. The right inspector is the canonical place to edit source and configure behavior.

## Elevation & Depth

Embed blocks should read as portable objects, not generic cards. Use a thin left accent rail, subtle inset surfaces, and a cartridge header. In decks, the same header appears in the inspector rather than on the slide unless selected.

## Shapes

Keep blocks rounded with `{rounded.md}`. Source editors use square-ish inner panes so code scans cleanly. Safety/status pills use `{rounded.pill}`.

## Components

### Block Registry

The registry should expose:

- `kind`: `html`, `mermaid`, `code`, `queryView`, `sheetRange`, `entity`, `file`, `bookmark`.
- `label`, `description`, `icon`, `accentColor`.
- `capabilities`: `sourceEditable`, `liveData`, `sandboxed`, `supportsDeckMotion`, `supportsThumbnail`.
- `entryPoints`: slash command, paste transform, add-object palette, inspector insert.
- `defaultConfig`: source placeholder, dimensions, render mode, safety defaults.

### HTML Embed Block

HTML is first-class, but sandboxed:

- Default renderer: `iframe srcdoc`.
- Default sandbox: no scripts, no same-origin, forms/popups disabled.
- Explicit trusted mode: user-visible toggle with warning copy; local-only first.
- Blocked state: render a clear "Scripts disabled" or "Content blocked" surface.
- Source edit: code panel with preview refresh and last-valid render fallback.

### Mermaid Block

Mermaid should share the same source/render pattern as HTML, but its safety story is compile errors rather than sandboxing:

- Source tab edits Mermaid syntax.
- Render tab previews compiled diagram.
- Error state points to the failing line when available.
- Decks can style frame/background independently from diagram source.

### Code Block

Code blocks are content by default, not executable embeds. Deck mode adds:

- Theme, line highlighting, font scale.
- Optional "step through highlights" transition metadata.
- Fit modes: scroll, shrink, crop.

### Query And Sheet Blocks

Query and sheet blocks are live data embeds:

- Registry metadata marks them as `liveData`.
- Rich text renders as inline data views.
- Decks can bind motion/state to snapshots or live refresh.
- Inspector must show source query/range, refresh state, and empty/error copy.

## Interaction Matrix

| Surface | User Action | Result |
| --- | --- | --- |
| Rich text | Type `/html` | Inserts an HTML block cartridge in flow with source editor focused. |
| Rich text | Paste iframe/snippet | Offers "Convert to HTML embed" instead of injecting raw document HTML. |
| Rich text | Toggle Preview | Renders the sandboxed iframe and preserves source in block config. |
| Deck | Add object → HTML | Places a 16:9 HTML object on the active slide and selects it. |
| Deck | Select HTML object | Right inspector opens Source tab with code editor and safety pill. |
| Deck | Change Style | Updates object frame/background/fit without mutating HTML source. |
| Deck | Add Motion | Stores object-level animation/transition metadata, not renderer-specific hacks. |
| Any | Renderer error | Shows block-level error with action: "Edit source" or "Reset to last valid". |

## Accessibility

- Slash command items must be keyboard reachable and announce block kind plus description.
- Flow block cartridges need `role="group"` with labels like "HTML embed block".
- Deck objects need selected state announced as "HTML object selected".
- Inspector tabs must be keyboard navigable and preserve focus when switching selected objects.
- HTML iframe gets a title derived from block label/title.
- Reduced motion disables animated previews and deck object motion playback in editing mode.

## Do's And Don'ts

Do:

- Treat blocks as portable semantic objects with per-surface chrome.
- Keep HTML source editing explicit and reversible.
- Make safety status visible without burying it in settings.
- Reuse slash command vocabulary in deck add-object controls.

Don't:

- Let raw pasted HTML silently become document DOM.
- Couple deck object layout metadata to TipTap node internals.
- Require deck users to click into a text editor just to add non-text slide objects.
- Hide renderer errors in browser console only.

## Open For Architect

1. Define the first implementation slice around `html` only, or include `mermaid` as the second proof point if existing Mermaid utilities make that cheap.
2. Decide whether the registry lives near `app/lib/slash-command-extension.ts` initially or as a new `app/lib/block-registry/*` module consumed by rich text and decks.
3. Specify the persisted block shape so deck objects can reference shared block config without embedding TipTap JSON directly.
4. Define the HTML sanitizer/sandbox policy and the exact trusted-script guardrails.
5. Preserve existing `RichTextEditor` embed commands and deck slide data while introducing the registry behind an adapter.

# Spec: Shared Block Embeds P0 — HTML Embed Across Rich Text And Decks

**Status:** Spec ready for Executor  
**Parent design:** `TRL-43`  
**Parent proposal:** `TRL-40`  
**Epic:** `TRL-26`  
**Design:** [shared_block_embeds_design.md](./shared_block_embeds_design.md)  
**Mock:** [shared_block_embeds_mockup.html](./shared_block_embeds_mockup.html)

## Goal

Prove the shared block/embed direction with one high-value block: a sandboxed `html` embed that can be inserted in rich text via slash command and placed on a deck slide as a selectable object with right-inspector source/safety controls.

This slice should establish the reusable block registry and renderer seam without refactoring every existing embed type. Mermaid, code, query views, sheet ranges, files, and bookmarks should appear as registry metadata or future-compatible types, but only `html` needs production rendering in this pass.

## Scope

### In

- Add a shared block registry module for portable embed metadata.
- Add a typed `HtmlEmbedConfig` / shared block config shape.
- Add a reusable HTML embed renderer component that renders `iframe srcdoc` with restrictive sandbox defaults.
- Add a TipTap HTML embed node and node view for `UiRichTextEditor`.
- Add `/html` to the slash command flow when `embeds` are enabled.
- Add paste handling for iframe/snippet-like HTML that offers or inserts an HTML embed instead of silently injecting raw document DOM.
- Add a deck slide object pilot for HTML embeds:
  - object can be added from the deck inspector or deck object controls;
  - object renders on the slide as a selectable object;
  - object source/safety/frame controls are edited in `DeckObjectInspector`;
  - object config persists in slide regions without coupling to TipTap JSON.
- Add focused unit tests and e2e coverage for the first shared block seam.

### Out

- Full migration of existing `UrlEmbed`, `QueryView`, `SheetRange`, entity embeds, or code blocks into the registry.
- Trusted remote script execution by default.
- Sanitizing arbitrary HTML into the host document DOM.
- General-purpose multi-object deck layout editor beyond the HTML object pilot.
- New route IA, global `IconRail`, `AppSidebar`, browse projection, or VCS kanban changes.
- Mermaid renderer implementation unless it is only metadata/test fixture work.

## Architecture

### Existing Shape

```text
UiRichTextEditor
  createSlashCommandExtension()
  TipTap nodes: QueryView, SheetRange, UrlEmbed, etc.
  node views own their own render UI

DeckProjectionFrame
  SlideCanvas
    fixed selectable regions: slide, eyebrow, title, body, queryView
  DeckObjectInspector
    edits selected fixed region
  useDeckProjection
    reads/writes SlideRegions fields to graph node data
```

### Target Shape For This Slice

```text
app/lib/block-registry/
  types.ts
  registry.ts
  html-embed.ts

HTML renderer seam
  HtmlEmbedFrame.vue        # shared, no TipTap dependency
  HtmlEmbedBlock.vue        # TipTap node-view wrapper
  html-embed-extension.ts   # TipTap node + commands + paste/input rules

Rich text
  slash command: /html
  TipTap content: htmlEmbed node

Deck
  SlideRegions.objects: DeckSlideObject[]
  object id: object:<id>
  SlideCanvas renders html object via HtmlEmbedFrame
  DeckObjectInspector edits selected object's source/render/style/safety
```

## Data Contract

Create a shared block config shape that can be used by TipTap attrs and deck slide objects.

```ts
export type SharedBlockKind =
  | 'html'
  | 'mermaid'
  | 'code'
  | 'queryView'
  | 'sheetRange'
  | 'entity'
  | 'file'
  | 'bookmark'

export type SharedBlockCapability =
  | 'sourceEditable'
  | 'sandboxed'
  | 'liveData'
  | 'supportsDeckMotion'
  | 'supportsThumbnail'

export interface SharedBlockDefinition {
  kind: SharedBlockKind
  label: string
  description: string
  icon: string
  group: 'Text' | 'Data' | 'Media' | 'Compute' | 'Presentation'
  accent: string
  capabilities: SharedBlockCapability[]
}

export interface HtmlEmbedSafety {
  allowScripts: false
  trusted: false
}

export interface HtmlEmbedConfig {
  kind: 'html'
  id?: string
  title?: string
  source: string
  height?: number
  safety: HtmlEmbedSafety
  lastValidSource?: string
}
```

For decks, persist object metadata separately from renderer config:

```ts
export interface DeckObjectFrame {
  x: number // 0-100 percent of slide width
  y: number // 0-100 percent of slide height
  width: number // 0-100
  height: number // 0-100
  zIndex?: number
}

export interface DeckSlideObject {
  id: string
  kind: 'html'
  block: HtmlEmbedConfig
  frame: DeckObjectFrame
  style?: {
    fit?: 'contain' | 'cover' | 'scroll'
    frame?: 'none' | 'card' | 'glass'
  }
  motion?: {
    enter?: 'none' | 'fade' | 'rise'
    transitionDelayMs?: number
  }
}
```

Extend `SlideRegions` with:

```ts
objects?: DeckSlideObject[]
```

Store `regions.objects` on graph nodes as JSON, matching the existing `regions.queryView` strategy. `useDeckProjection.parseRegionsFromNode()` must parse object JSON defensively and drop malformed entries rather than crashing the deck.

## HTML Safety Contract

The P0 safety policy is intentionally strict:

- Render with `<iframe :srcdoc="source">`.
- Sandbox attribute must be present and empty by default, or a curated value that still excludes scripts and same-origin. Do not include `allow-scripts`, `allow-same-origin`, `allow-forms`, or `allow-popups` in P0.
- Add `referrerpolicy="no-referrer"`.
- Add `title` from `HtmlEmbedConfig.title || 'HTML embed preview'`.
- Never inject the raw HTML source with `v-html` into the host document.
- Scripts should not execute. If the source contains `<script`, show a visible "Scripts disabled" safety pill, but still render the iframe sandboxed.
- Trusted/script mode may be represented in type comments or disabled UI copy, but must not be enabled in P0.

## Module Plan

| File | Change |
| ---- | ------ |
| `apps/web/app/lib/block-registry/types.ts` | Add shared block definitions and `HtmlEmbedConfig`/deck object types. |
| `apps/web/app/lib/block-registry/registry.ts` | Export registry metadata for `html`, `mermaid`, `code`, `queryView`, `sheetRange`, `entity`, `file`, `bookmark`; only `html` has full renderer support in P0. |
| `apps/web/app/lib/block-registry/html-embed.ts` | Add default config, sandbox attribute helpers, source/script detection, and validation helpers. |
| `apps/web/app/components/editor-blocks/HtmlEmbedFrame.vue` | Shared renderer for rich text and deck surfaces; renders iframe preview, source/error/safety chrome, edit/remove slots or emits. No TipTap imports. |
| `apps/web/app/components/editor-blocks/HtmlEmbedBlock.vue` | TipTap `NodeViewWrapper` around `HtmlEmbedFrame`; supports source editing, preview toggle, remove block. |
| `apps/web/app/lib/html-embed-extension.ts` | TipTap node named `htmlEmbed`; attrs mirror `HtmlEmbedConfig`; command `insertHtmlEmbed`; input rule for `::html{title="..."}` optional; paste handler for iframe/snippet-like source. |
| `apps/web/app/lib/slash-command-extension.ts` | Add `html-embed` command metadata, routed through a new `onEmbedHtml` callback. Keep existing commands intact. |
| `apps/web/app/components/Ui/RichTextEditor.vue` | Import/register `HtmlEmbed` and paste handler when `embeds` is enabled; wire `/html` to insert a default HTML embed block. |
| `apps/web/app/types/deck.ts` | Add `DeckSlideObject`, `DeckObjectFrame`, `SlideRegions.objects`, and object-selection type support such as `object:${id}`. |
| `apps/web/app/composables/useDeckSelection.ts` | Label `object:<id>` selections as "HTML embed" when matching active slide object metadata; Escape behavior remains. |
| `apps/web/app/composables/useDeckProjection.ts` | Parse/write `regions.objects` JSON; add helper or reuse `updateSlideRegions()` for object updates. |
| `apps/web/app/components/deck/SlideCanvas.vue` | Render `regions.objects` as absolutely positioned selectable objects over the slide; use `HtmlEmbedFrame` for `kind: 'html'`. |
| `apps/web/app/components/deck/DeckObjectInspector.vue` | Add "Add HTML embed" action under slide controls; when an HTML object is selected, show Source/Render/Style/Motion/Safety sections and emit `update-regions` patches. |
| `apps/web/tests/e2e/shared-block-embeds.spec.ts` | New e2e covering rich text `/html` insertion and deck Add HTML object/inspector flow. |
| `apps/web/app/lib/block-registry/shared-block-registry.test.ts` | Unit coverage for registry metadata and default HTML config. |
| `apps/web/app/lib/block-registry/html-embed.test.ts` | Unit coverage for sandbox helpers and script detection. |

## Behavioral Requirements

1. Rich text `/html` command appears only when `embeds` are enabled.
2. Selecting `/html` inserts an `htmlEmbed` block with editable source and a sandboxed preview.
3. Existing slash commands keep their labels/actions; no regression to entity/query/sheet/url/media commands.
4. Pasting an iframe or HTML snippet into `UiRichTextEditor` should not inject raw host DOM. It should create an HTML embed block or route to the same safe insertion path.
5. HTML preview uses `iframe srcdoc` and never `v-html` for untrusted source.
6. HTML source containing `<script` renders with a visible "Scripts disabled" indicator and does not execute scripts.
7. Deck slide inspector offers "Add HTML embed" while a slide is selected.
8. Adding an HTML embed creates a selected deck object with a stable `object:<id>` selection id and default frame centered on the slide.
9. Deck HTML object renders in `SlideCanvas` using the same `HtmlEmbedFrame` renderer as rich text.
10. Deck inspector source edits update `regions.objects` without mutating `regions.title`, `regions.body`, or TipTap node JSON.
11. Object frame/style/motion controls are stored on the deck object. P0 controls may be basic, but the data shape must not block future motion.
12. Malformed `regions.objects` data degrades safely: deck still renders existing title/body/query regions and shows no HTML object.
13. Read-only deck present/thumb/sorter surfaces do not expose editing controls; HTML object preview remains sandboxed.
14. No changes are made to `/workspace/browse`, VCS kanban, `IconRail`, `AppSidebar`, or projection outlet dispatch in this slice.

## Accessibility

- Slash command item for HTML has a label and description that are exposed through the existing menu button structure.
- Rich text HTML block wrapper has an accessible label such as `HTML embed block`.
- HTML iframe has a non-empty `title`.
- Source textarea has a visible label.
- Preview/source toggle is keyboard reachable.
- Deck HTML object selection announces through the existing `aria-live` selection announcement.
- Inspector controls are keyboard reachable and preserve focus on object edits.
- Reduced-motion preference disables deck object motion preview in edit mode.

## Testing

Executor should add or update tests with focused commands:

```bash
pnpm --filter @trellis/web exec eslint \
  app/lib/block-registry \
  app/lib/html-embed-extension.ts \
  app/components/editor-blocks/HtmlEmbedBlock.vue \
  app/components/editor-blocks/HtmlEmbedFrame.vue \
  app/components/Ui/RichTextEditor.vue \
  app/lib/slash-command-extension.ts \
  app/types/deck.ts \
  app/composables/useDeckProjection.ts \
  app/composables/useDeckSelection.ts \
  app/components/deck/SlideCanvas.vue \
  app/components/deck/DeckObjectInspector.vue \
  tests/e2e/shared-block-embeds.spec.ts
```

```bash
pnpm --filter @trellis/web test -- \
  app/lib/block-registry/shared-block-registry.test.ts \
  app/lib/block-registry/html-embed.test.ts
```

```bash
pnpm --filter @trellis/web test:e2e tests/e2e/shared-block-embeds.spec.ts
```

Run broader package checks if feasible, but report known baseline failures separately from touched-file failures.

## Acceptance Criteria

1. New shared block registry metadata exists for `html`, `mermaid`, `code`, `queryView`, `sheetRange`, `entity`, `file`, and `bookmark`; only `html` is fully rendered in P0.
2. `UiRichTextEditor` supports `/html` when embeds are enabled and inserts an editable `htmlEmbed` TipTap node.
3. HTML embeds render through a shared `HtmlEmbedFrame.vue` using sandboxed `iframe srcdoc`; raw source is never mounted via `v-html`.
4. HTML source with scripts shows a scripts-disabled safety state and scripts do not execute.
5. Deck slides support a persisted HTML object in `regions.objects`, rendered/selectable in `SlideCanvas`, and editable from `DeckObjectInspector`.
6. Existing rich text embeds and deck regions continue to work: entity/query/sheet/url slash commands, slide title/body/eyebrow/queryView editing, deck Escape-to-slide selection, and read-only presentation surfaces.
7. Tests pass: focused eslint, block-registry unit tests, and `tests/e2e/shared-block-embeds.spec.ts`.
8. No route/global navigation/projection-outlet changes are made outside the files listed in this spec.

## Notes For Executor

- Prefer adapting existing patterns from `UrlEmbed`, `QueryView`, and `SheetRange` rather than inventing a second TipTap integration style.
- Keep the renderer split clean: `HtmlEmbedFrame.vue` must be reusable outside TipTap.
- Do not add script-enabled trusted mode in this slice. Disabled UI copy is fine; execution is not.
- If deck multi-object plumbing becomes too large, keep the persisted `regions.objects` model but ship one default HTML object insertion path and one selected-object inspector path.
- Treat this as an architectural seam plus one working block, not the final block editor.

# In-App Web Browser

Add a fully functional web browser to Trellis as a first-class icon rail route, powered by a Tauri child WebviewWindow in native mode and a fallback `<iframe>` in web/dev mode.

---

## How it works (Tauri model)

Tauri v2 supports **multiple webviews inside a single window**. The Nuxt app occupies Webview A. When the browser page is active, a second native WebviewWindow (Webview B) is spawned and positioned to fill the content area below the browser chrome. The chrome itself is pure HTML rendered by Nuxt — back/forward/reload/address bar sit on top as an absolutely-positioned overlay.

```
┌─ Icon Rail ──────────────────────────────────────────────┐
│  ← → ⟳  🔖  [ https://example.com            ]  ✕      │  ← Nuxt HTML chrome
├──────────────────────────────────────────────────────────┤
│                                                          │
│           Tauri Child WebviewWindow                      │  ← native, renders URL
│                                                          │
└──────────────────────────────────────────────────────────┘
```

In web/dev mode, a sandboxed `<iframe>` renders in the same slot with a banner noting X-Frame-Options limitations.

---

## Phases

### Phase 1 — Tauri scaffold
- Init `apps/web/src-tauri/` (Cargo.toml, tauri.conf.json, main.rs, lib.rs)
- Rust commands: `browser_open(url, x, y, w, h)`, `browser_close()`, `browser_navigate(url)`, `browser_back()`, `browser_forward()`, `browser_reload()`, `browser_get_url()` → returns current URL, `browser_reposition(x, y, w, h)`
- Add `@tauri-apps/api` + `@tauri-apps/cli` to `apps/web/package.json`
- Add scripts: `tauri:dev`, `tauri:build`

### Phase 2 — Vue layer
- **`app/composables/useIsTauri.ts`** — detects `window.__TAURI_INTERNALS__`, SSR-safe
- **`app/composables/useBrowser.ts`** — reactive URL bar, loading state, history stack (back/forward arrays), tab list; wraps Tauri invokes with `useIsTauri` guard; iframe fallback for web mode
- **`app/components/browser/BrowserChrome.vue`** — address bar (submit on Enter), back/forward/reload buttons, loading spinner, "Save to Trellis" bookmark button, new-tab button
- **`app/pages/browser/index.vue`** — `definePageMeta({ layout: 'default' })`, `usePageShell().disableSidebar()`, renders `<BrowserChrome>` + conditionally `<iframe>` (web) or transparent content area (Tauri); listens to window resize → calls `browser_reposition`

### Phase 3 — Route registration
- Add `route:browser` to `server/utils/tql-routes.ts`: `inRail: true`, `railPosition: 'primary'`, icon `lucide:globe`, path `/browser`
- Add `ROUTE_PATHS.browser = '/browser'` to `app/config/routes.ts`

### Phase 4 — Bookmark integration
- **"Open in Browser"** context action on bookmark cards → `useBrowser().navigate(url)` + `navigateTo('/browser')`
- **"Save to Trellis"** button in `BrowserChrome.vue` → calls `useEntities().create({ type: 'bookmark', url, title })` using current WebviewWindow title/URL

### Phase 5 — Tab management *(optional, Phase 2 extension)*
- Each tab = one `WebviewWindow` with a unique label
- `useBrowser.tabs` array; tab bar below chrome; close/add tabs

---

## Key files

| File | Purpose |
|------|---------|
| `apps/web/src-tauri/src/lib.rs` | Tauri commands + WebviewWindow builder |
| `apps/web/src-tauri/Cargo.toml` | tauri 2, tauri-plugin-shell, serde |
| `apps/web/src-tauri/tauri.conf.json` | devUrl, capabilities, CSP |
| `app/composables/useIsTauri.ts` | Tauri detection utility |
| `app/composables/useBrowser.ts` | Browser state + Tauri/iframe bridge |
| `app/components/browser/BrowserChrome.vue` | Address bar + controls |
| `app/pages/browser/index.vue` | Browser page |
| `server/utils/tql-routes.ts` | Route registration |
| `app/config/routes.ts` | ROUTE_PATHS entry |

---

## Decisions

- **Child WebviewWindow over `<webview>` tag** — Tauri v2 removed the `<webview>` tag (Electron-style). The correct primitive is `WebviewWindow` or `WebviewBuilder` on a shared parent window.
- **Chrome stays HTML** — Keeping nav controls in Nuxt means full access to design system, entity CRUD, keyboard shortcuts. No need to duplicate UI in Rust.
- **Iframe fallback** — Dev/web mode shows `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups">`. Many sites will block it; that's acceptable since the feature is primarily for Tauri.
- **No history persistence** — In-memory back/forward stacks are sufficient for v1. TQL storage of browsing history is deferred.
- **Tauri scaffold is prerequisite** — `src-tauri/` must exist before Phase 2 is runnable. Phases 2–4 can be built and previewed in iframe mode independently.

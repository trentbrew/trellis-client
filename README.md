# Trellis

> _The semantic web was right. Just at the wrong scale._

A personal knowledge-graph platform. Every piece of information you own — tasks, notes, people, files, events, bookmarks — is a node. Relationships are edges. A local AI can query, reason over, and explain the whole thing. Your data stays yours, structured by you, readable by machines.

See [`VISION.md`](./VISION.md) for the thesis.

---

## Demo

<iframe
  src="https://player.mux.com/lZKxBYF1FvPCTpZMoEjkl01XyYa1TmWwdlR8yA1zH8Kk?metadata-video-title=nodebook2&video-title=nodebook2"
  style="width: 100%; border: none; aspect-ratio: 16/9;"
  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
  allowfullscreen
></iframe>

---

## Quick start

```bash
pnpm install
just dev                       # → http://localhost:1414
just trellis health --pretty   # sanity check
```

Or, in one go for desktop:

```bash
just desktop                   # auto-starts web + Tauri shell
```

> The web dev server runs on `localhost:$TRELLIS_PORT` (default `1414`). It is supervised by `apps/web/scripts/dev-safe.mjs` so transient `.nuxt/` issues self-heal.

---

## Repository map

```
.
├── apps/
│   ├── web/                  Nuxt 3 app (the main product)
│   └── desktop/              Tauri shell wrapping the web app
├── packages/
│   ├── tql/                  TQL kernel, EAV store, EQL-S query engine
│   ├── trellis-cli/          CLI + TypeScript SDK (`just trellis ...`)
│   ├── trellis-mcp/          MCP server — 48 tools for AI agents
│   ├── types/                Shared TypeScript types
│   └── utils/                Shared utilities
├── hooks/                    Windsurf/agent lifecycle hooks (TQL writers)
├── living-docs/              Auto-generated docs from TQL — see its README
├── docs/                     Hand-written docs (architecture, getting-started, pitch, …)
└── .windsurf/workflows/      Slash-command workflows (e.g. /agentize, /trellis-cli)
```

---

## Where to read next

Pick the entry point that matches your intent:

| If you want to…                                      | Read                                                           |
|------------------------------------------------------|----------------------------------------------------------------|
| Understand **what Trellis is** and why              | [`VISION.md`](./VISION.md), [`PRINCIPLES.md`](./PRINCIPLES.md) |
| Get the **system architecture overview**             | [`ARCHITECTURE.md`](./ARCHITECTURE.md)                         |
| Know the **conventions across the repo**             | [`CONVENTIONS.md`](./CONVENTIONS.md)                           |
| Be an **AI agent operating in this repo**            | [`AGENTS.md`](./AGENTS.md)                                     |
| Use the **MCP tools as an AI agent**                 | [`packages/trellis-mcp/SKILL.md`](./packages/trellis-mcp/SKILL.md) |
| Work inside **`apps/web/app/`** (the Nuxt frontend)  | [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md) |
| Set up **MCP for a coding assistant**                | [`docs/getting-started/SETUP.md`](./docs/getting-started/SETUP.md) |
| Verify a working install                             | [`docs/getting-started/VERIFICATION.md`](./docs/getting-started/VERIFICATION.md) |
| Deploy the web app                                   | [`docs/getting-started/deployment.md`](./docs/getting-started/deployment.md) |
| See the **demo / pitch story**                       | [`docs/pitch/PITCH.md`](./docs/pitch/PITCH.md), [`docs/pitch/LIVE.md`](./docs/pitch/LIVE.md) |
| Browse **architecture deep-dives**                   | [`docs/architecture/`](./docs/architecture)                    |
| Browse **research notes** (the Filegraph paper)      | [`docs/research/`](./docs/research)                            |

---

## MCP setup for AI assistants

Connect Claude / Windsurf / Cursor / Continue to Trellis in one command:

```bash
pnpm setup:mcp claude    # or: windsurf, cursor, continue
just setup-mcp claude    # alternative via justfile
```

Detailed flow: [`docs/getting-started/SETUP.md`](./docs/getting-started/SETUP.md).

---

## Common commands

```bash
just dev                # start the web app on $TRELLIS_PORT (1414 default)
just desktop            # start web + Tauri desktop shell
just build              # build all workspace packages
just test               # run all tests (pnpm -r --if-present test)
just lint               # run all linters
just typecheck          # run nuxi typecheck
just trellis -- --help  # CLI help
just trellis query 'FIND entity AS ?t WHERE ?t.type = "task"' --pretty
just trellis watch      # SSE stream of mutations
```

Full CLI reference: [`AGENTS.md`](./AGENTS.md) and [`.windsurf/workflows/trellis-cli.md`](./.windsurf/workflows/trellis-cli.md).

---

## Data modes

Trellis runs in two modes (toggled via `TRELLIS_DATA_MODE`):

| Mode    | Entity storage           | Platform data        | Default? |
|---------|--------------------------|----------------------|----------|
| `local` | TQL kernel (SQLite)      | instant-local (LS)   | yes      |
| `cloud` | InstantDB                | InstantDB            | opt-in   |

Local-first by default. Cloud is additive, not foundational. See [`PRINCIPLES.md`](./PRINCIPLES.md).

---

## License

See [`docs/LICENSE.md`](./docs/LICENSE.md).

# Nodebook

> _The semantic web was right. Just at the wrong scale._

A personal knowledge-graph platform. Every piece of information you own — tasks, notes, people, files, events, bookmarks — is a node. Relationships are edges. A local AI can query, reason over, and explain the whole thing. Your data stays yours, structured by you, readable by machines.

See [`VISION.md`](./VISION.md) for the thesis.

---

## Quick start

Requires **Node 20+** and a `bash` shell. One command installs everything else
(`just`, `bun`, the pinned `pnpm` via corepack) and runs `pnpm install`:

```bash
just setup               # one-command bootstrap (installs just/bun/pnpm, then pnpm install)
just dev                 # → http://localhost:1414
just trellis health --pretty
```

> Running `./scripts/bootstrap.sh` from a fresh clone does the same as `just setup` — no
> need to install `just` first. The repo is a **pnpm workspace** (`workspace:`
> protocol) — `npm install` will not work (the pinned version comes from
> `packageManager` in `package.json`).

`just` is the task runner — [install](https://github.com/casey/just#installation)
it once if you prefer to install it manually:

```bash
# macOS
brew install just
# other platforms
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to ~/.local/bin
```

Or, in one go for desktop:

```bash
just desktop                   # auto-starts web + Tauri shell
```

> The web dev server runs on `localhost:$TRELLIS_PORT` (default `1414`). It is supervised by `apps/web/scripts/dev-safe.mjs` so transient `.nuxt/` issues self-heal.

---

## Demo data

The repo ships with seed scripts that write demo entities into your local graph
via the running dev server, so you can explore a populated app without setting
up your own data:

```bash
just dev                                 # terminal 1 — start the app
pnpm --filter ./apps/web seed:deck       # terminal 2 — YC S26 demo deck + slides
pnpm --filter ./apps/web seed:sheet      # Q3 runway spreadsheet demo
pnpm --filter ./apps/web seed:deck:vcs   # NodebookVCS explainer deck
```

Each seeder hits `http://localhost:$TRELLIS_PORT/api/graph` and can be re-run
safely. Your own data is never touched by these scripts — they only add demo
entities.

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

| If you want to…                                     | Read                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Understand **what Nodebook is** and why              | [`VISION.md`](./VISION.md), [`PRINCIPLES.md`](./PRINCIPLES.md)                               |
| Get the **system architecture overview**            | [`ARCHITECTURE.md`](./ARCHITECTURE.md)                                                       |
| Know the **conventions across the repo**            | [`CONVENTIONS.md`](./CONVENTIONS.md)                                                         |
| Be an **AI agent operating in this repo**           | [`AGENTS.md`](./AGENTS.md)                                                                   |
| Use the **MCP tools as an AI agent**                | [`packages/trellis-mcp/SKILL.md`](./packages/trellis-mcp/SKILL.md)                           |
| Work inside **`apps/web/app/`** (the Nuxt frontend) | [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md)                               |
| Set up **MCP for a coding assistant**               | [`docs/getting-started/SETUP.md`](./docs/getting-started/SETUP.md)                           |
| Verify a working install                            | [`docs/getting-started/VERIFICATION.md`](./docs/getting-started/VERIFICATION.md)             |
| Deploy the web app                                  | [`docs/getting-started/deployment.md`](./docs/getting-started/deployment.md)                 |
| See the **demo / pitch story**                      | [`docs/pitch/PITCH.md`](./docs/pitch/PITCH.md), [`docs/pitch/LIVE.md`](./docs/pitch/LIVE.md) |
| Browse **architecture deep-dives**                  | [`docs/architecture/`](./docs/architecture)                                                  |
| Browse **research notes** (the Filegraph paper)     | [`docs/research/`](./docs/research)                                                          |

---

## MCP setup for AI assistants

Connect Claude / Windsurf / Cursor / Continue to Nodebook in one command:

```bash
pnpm setup:mcp claude    # or: windsurf, cursor, continue
just setup-mcp claude    # alternative via justfile
```

Detailed flow: [`docs/getting-started/SETUP.md`](./docs/getting-started/SETUP.md).

---

## Common commands

```bash
just setup               # one-command bootstrap (installs just/bun/pnpm, then pnpm install)
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

Nodebook runs in two modes (toggled via `TRELLIS_DATA_MODE`):

| Mode    | Entity storage      | Platform data      | Default? |
| ------- | ------------------- | ------------------ | -------- |
| `local` | TQL kernel (SQLite) | instant-local (LS) | yes      |
| `cloud` | InstantDB           | InstantDB          | opt-in   |

Local-first by default. Cloud is additive, not foundational. See [`PRINCIPLES.md`](./PRINCIPLES.md).

---

## License

MIT — see [`LICENSE`](./LICENSE).

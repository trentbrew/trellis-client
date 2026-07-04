# Remote MCP — connect claude.ai and ChatGPT to a Trellis room

Status: M2 (seeded + write-gated). Scope and findings: [`.agent/plans/WU-REMOTE-MCP-000-proposal.md`](../../.agent/plans/WU-REMOTE-MCP-000-proposal.md).

**What's in the room:** Campus substrate (founder facility, Lobby + Showroom zones), a Lobby greeter (`entity:commons-lobby-readme` — arriving agents should read it first), and the published Showroom content (YC S26 demo deck). Re-publish anytime with `node scripts/publish-to-room.mjs --apply` (idempotent; dry run without the flag; only Lobby/Showroom entities ever leave the laptop, backstage fields redacted).

## The room

| | |
|---|---|
| Room | `campus-commons` |
| Base URL | `https://campus-commons-bnsoz.sprites.app` |
| MCP endpoint | `https://campus-commons-bnsoz.sprites.app/trellis/mcp` (Sprites reserves `/mcp`) |
| Health | `https://campus-commons-bnsoz.sprites.app/health` |
| Credentials | `.trellis-db.json` in repo root (gitignored — never commit) |

**Data policy (D3):** this room only ever contains public-shaped content (Showroom/Lobby zones). No mail, calendar, finance, or contacts.

**Auth policy (F1, live):** read tools work without auth; **write tools require** `Authorization: Bearer <spk_…>` (or JWT). The room graph is world-readable by design (D3) — auth gates mutation, not browsing.

## Write policy (read vs mutate)

The room is **world-readable, write-gated**. This is intentional (D4): public connectors can browse the curated slice; only credentialed clients can append to the op-log.

| Tool | Auth | Notes |
|------|------|-------|
| `get_graph_summary`, `graph_health` | None | Start here |
| `get_node`, `query_graph` | None | See query dialect below |
| `create_node`, `update_node`, `delete_node`, `link_nodes` | **Bearer or JWT** | Without `Authorization`, returns: *Authentication required for graph writes* |

### Attribution (required on every write)

Every mutating call must carry a **lane** so ops are auditable in the append-only log:

- Tool arg: `"lane": "agent:claude-web"` (or `agent:chatgpt`, `agent:cursor`, …)
- Or header: `X-Trellis-Lane: agent:claude-web`

Use a **distinct lane per web head** — not the same lane as Claude Code (`agent:claude`) or the publish script.

### Zone scope (required on entity attributes)

Writes must land in an allowed public zone. Set on the entity's `attributes`:

- `zoneId`: `entity:founder-facility-lobby` or `entity:founder-facility-showroom`
- `facilityId`: `entity:founder-facility`

The greeter (`entity:commons-lobby-readme`) documents this policy for arriving agents.

### When to stay read-only

**Recommended for claude.ai / ChatGPT connectors in M1:** no auth, browse only. The public slice is safe to expose; you don't want an unauthenticated connector accidentally gaining write if the UI misconfigures auth.

**Enable bearer writes when:** you want to demo attributed mutation from a web head, or you're the only user and the connector UI supports an API key / custom header.

### Write smoke test

With bearer configured, ask the agent to call `create_node`:

```json
{
  "type": "note",
  "id": "entity:write-smoke-test",
  "attributes": {
    "title": "Write smoke test",
    "zoneId": "entity:founder-facility-lobby",
    "facilityId": "entity:founder-facility"
  },
  "lane": "agent:claude-web"
}
```

Confirm with `get_node`, then `delete_node` with the same lane to clean up.

### If the connector UI has no bearer field

Many web connector UIs are read-only by construction. Fallbacks:

- **stdio bridge** (desktop): `npx trellis mcp bridge --room https://campus-commons-bnsoz.sprites.app --api-key <spk_…>`
- **Cursor remote MCP** — supports `headers.Authorization` (see below)
- **Publish script** — `node scripts/publish-to-room.mjs --apply` (local → room, `agent:claude` lane)
- **OAuth** — blocked on F3 (RFC 7591 DCR) until trellis-node ships dynamic client registration

## Query dialect (room vs local)

The room MCP uses **trellis-node** query syntax — not the local campus graph's `FIND entity AS … RETURN` form.

| Surface | Example |
|---------|---------|
| **Room** (campus-commons) | `find ?e where type = "zone"` |
| **Room** (full EQL-S) | `SELECT ?e WHERE { [?e "type" "note"] }` |
| **Local** (Claude Code / :1414) | `FIND entity AS ?e WHERE ?e.type = "task" RETURN ?e.title` |

Always use **`?e`** as the binding variable on the room — hydration keys off `e` / `id`.

Response shape: `{ "bindings": [...], "executionTime": … }` (not local's `{ "data": [...] }`).

The Lobby greeter embeds this hint for arriving agents.

## claude.ai (web / desktop)

### Read-only (simplest)

1. **Settings → Connectors → Add custom connector**
2. URL: `https://campus-commons-bnsoz.sprites.app/trellis/mcp`
3. Auth: **none**
4. In a chat, enable the connector; ask e.g. *"Call get_graph_summary — then read the Lobby greeter note."*

This room is a **curated public slice**, not your personal campus graph. If the summary shows ~16 entities, you're on the right room.

### Writes (bearer)

If the connector UI supports custom headers or API key auth, add:

```
Authorization: Bearer <spk_… from .trellis-db.json>
```

See **Write policy** above for lane, zone, and smoke-test requirements. If writes fail with *Authentication required*, the connector has no bearer — that is correct for a read-only setup.

OAuth-mode connectors remain blocked on F3 (dynamic client registration) until trellis-node ships RFC 7591 DCR.

## ChatGPT

1. **Settings → Connectors → Advanced → enable Developer mode** (Plus/Pro)
2. Add connector → URL: `https://campus-commons-bnsoz.sprites.app/trellis/mcp`
3. Read-only: no auth. Writes: add bearer header if supported.
4. Smoke test: `get_graph_summary` → expect healthy graph with Lobby greeter + Showroom deck.

## Claude Code / Cursor

**Local campus graph** (private, 68k facts):

```jsonc
// .mcp.json — stdio to localhost:1414
{ "command": "node", "args": ["packages/trellis-mcp/bin/serve.mjs"],
  "env": { "TRELLIS_PORT": "1414", "TRELLIS_AGENT_ID": "claude" } }
```

**Remote room** (public slice):

```jsonc
// Cursor remote MCP
{ "url": "https://campus-commons-bnsoz.sprites.app/trellis/mcp",
  "headers": { "Authorization": "Bearer <spk_…>" } }

// stdio bridge (any MCP client)
// npx trellis mcp bridge --room https://campus-commons-bnsoz.sprites.app --api-key <spk_…>
```

## Publish script

```bash
# dry run — manifest only
node scripts/publish-to-room.mjs

# write to room (requires local dev on :1414 + bearer in .trellis-db.json)
node scripts/publish-to-room.mjs --apply
```

## Smoke checks

```bash
curl -s https://campus-commons-bnsoz.sprites.app/health
curl -s https://campus-commons-bnsoz.sprites.app/.well-known/oauth-authorization-server
# expect issuer + mcp_resource both https://…/trellis/mcp
```

## Upstream changes (trellis-node 3.2.4+)

- `src/mcp/mcp-auth.ts` — write gate when `apiKey` configured
- `src/server/public-origin.ts` — HTTPS OAuth metadata on Sprites
- Redeploy after engine changes: `trellis deploy --name campus-commons --key <existing spk_…>`

# Trellis MCP Setup

Connect AI coding assistants to the Trellis MCP server for access to all 48 tools (15 graph + 33 platform).

## Quick Setup (Recommended)

**One command to configure any AI assistant:**

```bash
# Using pnpm
pnpm setup:mcp claude

# Or using just
just setup-mcp claude

# Available assistants:
# - claude      (Claude Code)
# - windsurf    (Windsurf/Codeium)
# - cursor      (Cursor)
# - continue    (Continue)

# Configure all at once
pnpm setup:mcp --all
```

**What the script does:**
1. Creates the config directory for your AI assistant (`~/.claude/`, `~/.codeium/windsurf/`, etc.)
2. Adds the Trellis MCP server configuration with the correct paths
3. Sets the appropriate agent ID for mutation tracking
4. Verifies the dev server is running on port 1414

**That's it!** Just restart your AI assistant and it will have access to all 48 Trellis tools.

---

## Manual Setup (Alternative)

If you prefer to configure manually or need to customize the setup:

### Prerequisites

1. **Dev server running** on port 1414 (`just dev-v2`)
2. **AI coding assistant installed** (Claude Code, Windsurf, Cursor, or Continue)

### Setup Steps

### 1. Locate Claude Code's MCP config file

Claude Code stores MCP server configurations in:
```
~/.claude/settings.json
```

### 2. Add the Trellis MCP server

The config already exists in your repo at `.claude/settings.json`. Let me verify it's correct:

Perfect! The config file is already set up correctly. Let me walk you through the complete setup process:

## Claude Code MCP Setup — Step by Step

### 1. **Copy the config to Claude's directory**

The config exists in your repo at [.claude/settings.json](cci:7://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/.claude/settings.json:0:0-0:0), but Claude Code reads from `~/.claude/settings.json`. You need to either:

**Option A: Symlink (recommended)**
```bash
# Create ~/.claude directory if it doesn't exist
mkdir -p ~/.claude

# Symlink the repo config to Claude's config location
ln -sf /Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/.claude/settings.json ~/.claude/settings.json
```

**Option B: Copy**
```bash
mkdir -p ~/.claude
cp .claude/settings.json ~/.claude/settings.json
```

### 2. **Verify the dev server is running**

The MCP server connects to your Trellis dev server on port 1414:

```bash
# Check if dev server is running
curl -s http://localhost:1414/api/graph/health | jq
```

If not running, start it:
```bash
just dev-v2
```

### 3. **Restart Claude Code**

After updating `~/.claude/settings.json`, you must **fully quit and restart** Claude Desktop for it to pick up the MCP server configuration.

### 4. **Verify MCP connection**

Once Claude Code restarts, you should see:

1. **In Claude's UI**: A small indicator showing connected MCP servers (usually in the bottom status bar or settings panel)
2. **Tool availability**: Claude will now have access to all 48 Trellis tools

You can test it by asking Claude Code something like:
> "Use the [graph_health](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:682:2-684:3) tool to check the Trellis graph status"

or

> "Use [list_orgs](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:727:2-729:3) to show me all organizations"

### 5. **What the config does**

```json
{
  "mcpServers": {
    "trellis": {
      "command": "node",                              // Run Node.js
      "args": ["packages/trellis-mcp/bin/serve.mjs"], // Execute the MCP server
      "env": {
        "TRELLIS_PORT": "1414",                       // Connect to dev server on :1414
        "TRELLIS_AGENT_ID": "claude-code"             // Tag mutations as from Claude
      }
    }
  }
}
```

When Claude Code starts, it:
1. Spawns `node packages/trellis-mcp/bin/serve.mjs` as a subprocess
2. Communicates via stdio (standard input/output)
3. The MCP server makes HTTP requests to `http://localhost:1414/api/graph/*` and `/api/platform/*`
4. All mutations are tagged with `agentId: "claude-code"` (visible in `just trellis log`)

### 6. **Available tools in Claude Code**

Claude now has access to:

**Graph tools (15)**:
- [query_graph](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:642:2-644:3), [get_node](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:646:2-648:3), [get_nodes](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:650:2-652:3), [create_node](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:654:2-659:3), [update_node](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:661:2-666:3), [delete_node](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:668:2-673:3), [link_nodes](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:675:2-680:3)
- [graph_health](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:682:2-684:3), [get_schema](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:686:2-688:3), [get_catalog](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:690:2-692:3), [get_mutation_log](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:694:2-696:3)
- [get_ontology](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:698:2-700:3), [create_ontology](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:702:2-708:3), [update_ontology](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:710:2-716:3), [delete_ontology](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:718:2-723:3)

**Platform tools (33)**:
- [list_orgs](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:727:2-729:3), [create_org](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:731:2-736:3), [get_org](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:738:2-740:3)
- [list_apps](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:742:2-745:3), [create_app](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:747:2-752:3), [update_app](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:754:2-759:3), [delete_app](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:761:2-766:3), [get_context](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:768:2-773:3)
- [list_collections](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:777:2-780:3), [create_collection](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:782:2-787:3), [update_collection](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:789:2-794:3), [delete_collection](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:796:2-801:3)
- [list_pages](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:803:2-806:3), [create_page](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:808:2-813:3), [update_page](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:815:2-820:3), [delete_page](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:822:2-827:3)
- [list_comments](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:831:2-833:3), [add_comment](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:835:2-840:3), [list_tags](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:842:2-844:3), [create_tag](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:846:2-851:3), [assign_tags](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:853:2-858:3)
- [bulk_update](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:862:2-867:3), [bulk_delete](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:869:2-874:3)
- [list_workflows](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:876:2-879:3), [create_workflow](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:881:2-886:3), [update_workflow](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:888:2-893:3), [delete_workflow](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:895:2-900:3)
- [get_setting](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:904:2-908:3), [set_setting](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:910:2-915:3), [list_settings](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:917:2-920:3), [send_invite](cci:1://file:///Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt/packages/trellis-mcp/src/server.mjs:922:2-927:3)

### 7. **Troubleshooting**

If Claude can't see the tools:

1. **Check the symlink/copy worked**:
   ```bash
   cat ~/.claude/settings.json
   ```

2. **Check dev server is accessible**:
   ```bash
   curl http://localhost:1414/api/graph/health
   ```

3. **Check MCP server runs standalone**:
   ```bash
   cd /Users/trentbrew/TURTLE/Projects/Apps/TRELLIS-WEB/client-nuxt
   TRELLIS_PORT=1414 node packages/trellis-mcp/bin/serve.mjs
   ```
   (Should start without errors; Ctrl+C to stop)

4. **Check Claude's logs** (location varies by OS, usually `~/Library/Logs/Claude/` on macOS)

---

That's it! Once you've symlinked the config and restarted Claude Code, it should have full access to all 48 Trellis tools and can perform any operation you can do via the CLI.

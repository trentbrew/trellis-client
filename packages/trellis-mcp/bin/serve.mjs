#!/usr/bin/env node

/**
 * Trellis MCP Server — stdio entry point.
 *
 * Usage:
 *   node packages/trellis-mcp/bin/serve.mjs
 *
 * Environment:
 *   TRELLIS_API_URL   — Base URL of Trellis dev server (default: http://localhost:4141)
 *   TRELLIS_AGENT_ID  — Agent identifier for mutation attribution (default: mcp)
 */

import '../src/server.mjs'

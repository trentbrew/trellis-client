#!/usr/bin/env node

/**
 * Trellis MCP Server — stdio entry point.
 *
 * Usage:
 *   node packages/trellis-mcp/bin/serve.mjs
 *
 * Environment:
 *   TRELLIS_API_URL   — Base URL of Trellis dev server (default: http://localhost:$TRELLIS_PORT)
 *   TRELLIS_PORT      — Dev server port fallback when TRELLIS_API_URL is not set (default: 1414)
 *   TRELLIS_AGENT_ID  — Agent identifier for mutation attribution (default: mcp)
 */

import '../src/server.mjs'

#!/usr/bin/env bash
# Quick agent-browser pilot against local Trellis (dev must be on :1414).
set -euo pipefail

PORT="${TRELLIS_PORT:-1414}"
BASE="http://localhost:${PORT}"
SESSION="${AGENT_BROWSER_SESSION:-trellis-pilot}"
PATH_SUFFIX="${1:-/workspace/browse?type=note&testAuthBypass=true}"

export AGENT_BROWSER_SESSION="$SESSION"

if ! curl -sf "${BASE}/api/graph/health" >/dev/null; then
  echo "Dev server not up on ${BASE} — start: just run (or jr)" >&2
  exit 1
fi

echo "→ session: ${SESSION}"
echo "→ open: ${BASE}${PATH_SUFFIX}"

agent-browser open "${BASE}${PATH_SUFFIX}"
agent-browser wait --load networkidle
agent-browser snapshot -i -c -d 5
echo ""
echo "Dock refs (campus shell):"
agent-browser snapshot -i -c -d 3 -s '[aria-label="Navigation rail"]' 2>/dev/null || true
agent-browser screenshot --annotate .agent/ab-pilot.png
echo ""
echo "Screenshot: .agent/ab-pilot.png"
echo "Try: agent-browser click @e18   # bell"
echo "     agent-browser close"

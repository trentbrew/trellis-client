#!/usr/bin/env bash
set -euo pipefail

# Cleanup script for dead seed data files
# Part of codebase consolidation effort (plan: codebase-consolidation-b0cadf.md)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Cleaning up dead seed files..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Dead seed files (no live imports)
DEAD_FILES=(
  "apps/web/app/lib/personalSeedData.ts"
  "apps/web/app/lib/bookmarkSeedData.ts"
  "apps/web/app/lib/entitySeedData.ts"
  "apps/web/app/lib/slideDeckSeedData.ts"
  "apps/web/app/lib/demoSeed.ts"
  "apps/web/server/utils/tql-seed.ts"
)

DELETED_COUNT=0
MISSING_COUNT=0

for file in "${DEAD_FILES[@]}"; do
  FULL_PATH="$PROJECT_ROOT/$file"

  if [[ -f "$FULL_PATH" ]]; then
    echo "✓ Deleting: $file"
    rm "$FULL_PATH"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    echo "⚠ Already gone: $file"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Cleanup complete!"
echo "   Deleted: $DELETED_COUNT files"
echo "   Already missing: $MISSING_COUNT files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

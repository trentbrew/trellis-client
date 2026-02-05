#!/bin/bash

# Fix for Nuxt 4.2.x client.precomputed.mjs bug
# GitHub Issue: https://github.com/nuxt/nuxt/issues/33579
# This script pins Nuxt to 4.1.2 until the bug is fixed

set -e

echo "🔧 Nuxt 4.2.x Bug Fix Script"
echo "============================"
echo ""

# Check if we're in a Nuxt project
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Are you in a Nuxt project root?"
    exit 1
fi

if ! grep -q '"nuxt"' package.json; then
    echo "❌ Error: This doesn't appear to be a Nuxt project (no nuxt dependency found)"
    exit 1
fi

echo "✅ Nuxt project detected"

# Get current Nuxt version
CURRENT_VERSION=$(grep -o '"nuxt": *"[^"]*"' package.json | grep -o '[0-9][^"]*' || echo "unknown")
echo "📦 Current Nuxt version: $CURRENT_VERSION"

# Check if already pinned to 4.1.2
if [ "$CURRENT_VERSION" = "4.1.2" ]; then
    echo "✅ Already pinned to 4.1.2"
else
    echo "📝 Updating package.json to pin Nuxt to 4.1.2..."
    
    # Use sed to replace the nuxt version (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/"nuxt": *"[^"]*"/"nuxt": "4.1.2"/' package.json
    else
        sed -i 's/"nuxt": *"[^"]*"/"nuxt": "4.1.2"/' package.json
    fi
    
    echo "✅ package.json updated"
fi

echo ""
echo "🧹 Cleaning build artifacts and dependencies..."

# Remove build artifacts
rm -rf .nuxt dist .output 2>/dev/null || true
echo "  ✓ Removed .nuxt, dist, .output"

# Remove lock files and node_modules
rm -rf node_modules 2>/dev/null || true
echo "  ✓ Removed node_modules"

# Detect package manager and remove appropriate lock file
if [ -f "pnpm-lock.yaml" ]; then
    rm -f pnpm-lock.yaml
    echo "  ✓ Removed pnpm-lock.yaml"
    PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    rm -f yarn.lock
    echo "  ✓ Removed yarn.lock"
    PKG_MANAGER="yarn"
elif [ -f "bun.lockb" ]; then
    rm -f bun.lockb
    echo "  ✓ Removed bun.lockb"
    PKG_MANAGER="bun"
else
    rm -f package-lock.json
    echo "  ✓ Removed package-lock.json"
    PKG_MANAGER="npm"
fi

echo ""
echo "📥 Reinstalling dependencies with $PKG_MANAGER..."
$PKG_MANAGER install

echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Run '$PKG_MANAGER dev' to start the dev server"
echo "   2. Monitor https://github.com/nuxt/nuxt/issues/33579 for updates"
echo "   3. Once fixed, update to the new version and test thoroughly"
echo ""

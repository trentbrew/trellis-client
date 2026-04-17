# Trellis Monorepo
# Run `just` to see available commands

set dotenv-load

run:
  @just dev

# Default: show help
default:
    @just --list

# Install all dependencies
install:
    pnpm install

# Start Trellis web app dev server
dev:
    @echo "🚀 Starting Trellis dev server..."
    pnpm --filter ./apps/web dev

# Start desktop app (auto-starts web dev server in background)
desktop:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🚀 Starting Trellis web server..."
    pnpm --filter ./apps/web dev &
    WEB_PID=$!
    echo "⏳ Waiting for web server on :1414..."
    until curl -s http://localhost:1414/api/graph/health > /dev/null 2>&1; do sleep 1; done
    echo "✅ Web server ready — launching desktop..."
    pnpm --filter ./apps/desktop dev
    kill $WEB_PID 2>/dev/null || true

# Build all packages
build:
    pnpm -r build

# Build Trellis web app only
build-web:
    pnpm --filter ./apps/web build

# Run linting across all packages
lint:
    pnpm -r lint

# Fix lint issues across all packages
lint-fix:
    pnpm -r lint:fix

# Format all files
format:
    pnpm -r format

# Run tests across all packages
test:
    pnpm -r test

# Run typechecking
typecheck:
    pnpm -r typecheck

# Clean all node_modules and build artifacts
clean:
    rm -rf node_modules
    rm -rf apps/v1/node_modules apps/v1/dist
    rm -rf apps/v2/node_modules apps/v2/.nuxt apps/v2/dist
    rm -rf packages/*/node_modules

# Reset everything and reinstall
reset: clean install

# Update dependencies
update:
    pnpm update -r --latest

# Generate Nix flake lock
nix-lock:
    nix flake update

# Enter Nix dev shell
nix-shell:
    nix develop

# Auto-commit changes every minute (useful for backup)
auto-commit interval="60":
    ./.scripts/auto-commit.sh {{interval}}

# ── Trellis CLI ──────────────────────────────────────────────────────────

# Setup MCP for AI assistants (claude, windsurf, cursor, continue, or --all)
setup-mcp assistant="--help":
    node scripts/setup-mcp.mjs {{assistant}}

# Run the trellis CLI (pass arguments after --)
trellis *ARGS:
    node packages/trellis-cli/bin/trellis.mjs {{ARGS}}

# Quick: query the graph
trellis-query *EQLS:
    node packages/trellis-cli/bin/trellis.mjs query {{EQLS}}

# Quick: watch for realtime mutations
trellis-watch:
    node packages/trellis-cli/bin/trellis.mjs watch --pretty

# Quick: health check
trellis-health:
    node packages/trellis-cli/bin/trellis.mjs health --pretty

# E2E smoke test (requires running dev server on $TRELLIS_PORT)
trellis-test:
    node packages/trellis-cli/test/e2e.mjs

# ── InstantDB CLI ──────────────────────────────────────────────────────

# Run any instant-cli command (pass arguments after --)
instant *ARGS:
    cd apps/web && pnpm exec instant-cli {{ARGS}} --app "$INSTANTDB_APP_ID"

# Push schema to InstantDB cloud
instant-push-schema:
    cd apps/web && pnpm exec instant-cli push schema --app "$INSTANTDB_APP_ID"

# Push permissions to InstantDB cloud
instant-push-perms:
    cd apps/web && pnpm exec instant-cli push perms --app "$INSTANTDB_APP_ID"

# Push both schema and permissions
instant-push: instant-push-schema instant-push-perms

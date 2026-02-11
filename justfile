# Toolkit UI Monorepo
# Run `just` to see available commands

set dotenv-load

run:
  @just dev-all

# Default: show help
default:
    @just --list

# Install all dependencies
install:
    pnpm install

# Start v1 (component library) dev server
dev-v1:
    pnpm --filter @toolkit/ui dev

# Start v2 (Nuxt sandbox) dev server
dev-v2:
    pnpm --filter @toolkit/sandbox dev

# Start both dev servers (requires tmux or similar)
dev-all:
    @echo "Starting both dev servers..."
    @echo "  v1: http://localhost:5173"
    @echo "  v2: http://localhost:5151"
    pnpm --filter @toolkit/ui dev & pnpm --filter @toolkit/sandbox dev

# Start v2 dev server
dev-v2-safe:
    @echo "🚀 Starting v2 dev server..."
    pnpm --filter @toolkit/sandbox dev

# Build all packages
build:
    pnpm -r build

# Build v1 only
build-v1:
    pnpm --filter @toolkit/ui build

# Build v2 only
build-v2:
    pnpm --filter @toolkit/sandbox build

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

# E2E smoke test (requires running dev server on :4141)
trellis-test:
    node packages/trellis-cli/test/e2e.mjs

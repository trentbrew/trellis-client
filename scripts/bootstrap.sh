#!/usr/bin/env bash
# One-command bootstrap for new contributors.
#
#   ./scripts/bootstrap.sh      # installs just/bun/pnpm if missing, then pnpm install
#   just setup                  # same thing via the justfile
#
# Safe to re-run: it skips tools that are already present and `pnpm install` is idempotent.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------

command -v node >/dev/null 2>&1 || {
  warn "Node.js 20+ is required but not on PATH."
  warn "Install it (nvm / brew / your distro), then re-run this script."
  exit 1
}

# --- just (task runner) ----------------------------------------------------
if ! command -v just >/dev/null 2>&1; then
  say "just not found — installing..."
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew install just
  else
    curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to ~/.local/bin
    export PATH="$HOME/.local/bin:$PATH"
    if ! command -v just >/dev/null 2>&1; then
      warn "just installed to ~/.local/bin — add 'export PATH=\"\$HOME/.local/bin:\$PATH\"' to your shell profile."
      exit 1
    fi
  fi
fi

# --- bun (required by the trellis sidecar) ---------------------------------
if ! command -v bun >/dev/null 2>&1; then
  say "bun not found — installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  if ! command -v bun >/dev/null 2>&1; then
    warn "bun installed to ~/.bun/bin — add 'export PATH=\"\$HOME/.bun/bin:\$PATH\"' to your shell profile."
    exit 1
  fi
fi

# --- pnpm (pinned via corepack) ---------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  say "pnpm not found — enabling via corepack..."
  corepack enable
  corepack prepare pnpm@10.8.0 --activate
fi

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

say "Installing workspace dependencies (pnpm install)..."
pnpm install

say "Setup complete."
say "Next: just dev  # → http://localhost:1414"

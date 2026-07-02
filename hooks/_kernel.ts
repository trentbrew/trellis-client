/**
 * Shared kernel factory for all HQ hooks.
 *
 * Centralizes backend selection so the SQLite→JSONL migration
 * happens in one place instead of across 15 hook files.
 */

import { TrellisKernel } from '../packages/trellis-kernel/kernel/trellis-kernel.js';
import { JsonlKernelBackend } from '../packages/trellis-kernel/persist/jsonl-backend.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

export const PROJECT_ROOT = resolve(import.meta.dirname, '..');
export const TRELLIS_HQ_DIR = resolve(PROJECT_ROOT, '.trellis/hq');
export const HQ_REL_PATH = '.trellis/hq';
const LEGACY_TQL_DIR = resolve(PROJECT_ROOT, '.tql');

let legacyWarned = false;

/** Resolve active HQ data directory (canonical or legacy fallback). */
export function resolveActiveHqDir(root: string = PROJECT_ROOT): string {
  const canonical = resolve(root, '.trellis/hq');
  const legacy = resolve(root, '.tql');

  if (existsSync(resolve(canonical, 'ops.jsonl'))) {
    return canonical;
  }
  if (existsSync(resolve(legacy, 'ops.jsonl'))) {
    if (root === PROJECT_ROOT && !legacyWarned) {
      console.warn(
        '[HQ] Deprecated: reading HQ data from .tql/ — run: node scripts/migrate-tql-dir.mjs',
      );
      legacyWarned = true;
    }
    return legacy;
  }
  return canonical;
}

const HQ_DIR = resolveActiveHqDir();

/** @deprecated Phase 5 — use TRELLIS_HQ_DIR or resolveActiveHqDir() */
export const TQL_DIR = HQ_DIR;

export const OPS_PATH = resolve(HQ_DIR, 'ops.jsonl');
export const WORKSPACE_PATH = resolve(HQ_DIR, 'workspace.json');

/**
 * Creates a TrellisKernel backed by the JSONL op log.
 * All hooks should use this instead of instantiating backends directly.
 */
export function createKernel(opts?: { autoReplay?: boolean }): TrellisKernel {
  const backend = new JsonlKernelBackend({ filename: OPS_PATH });
  return new TrellisKernel({
    backend,
    autoReplay: opts?.autoReplay ?? true,
  });
}

/**
 * Guard: exits with error if the op log doesn't exist yet.
 * Call this at the top of hooks that require an initialized kernel.
 */
export function requireInit(): void {
  if (!existsSync(OPS_PATH)) {
    console.error(`[HQ] No ${HQ_REL_PATH}/ops.jsonl found. Run: bun run hq:init`);
    process.exit(1);
  }
}

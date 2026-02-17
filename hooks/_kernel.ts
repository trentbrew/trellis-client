/**
 * Shared kernel factory for all HQ hooks.
 *
 * Centralizes backend selection so the SQLite→JSONL migration
 * happens in one place instead of across 15 hook files.
 */

import { TrellisKernel } from '../packages/tql/kernel/trellis-kernel.js';
import { JsonlKernelBackend } from '../packages/tql/persist/jsonl-backend.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

export const PROJECT_ROOT = resolve(import.meta.dirname, '..');
export const TQL_DIR = resolve(PROJECT_ROOT, '.tql');
export const OPS_PATH = resolve(TQL_DIR, 'ops.jsonl');
export const WORKSPACE_PATH = resolve(TQL_DIR, 'workspace.json');

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
    console.error('[HQ] No .tql/ops.jsonl found. Run: bun run hq:init');
    process.exit(1);
  }
}

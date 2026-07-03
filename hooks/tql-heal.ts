#!/usr/bin/env bun

/**
 * HQ Heal — self-healing hook that detects and repairs TQL infrastructure issues.
 *
 * Checks for:
 *   - Missing .tql/ directory or files
 *   - Corrupted ops.jsonl (invalid JSON lines)
 *   - Missing workspace.json
 *   - Kernel boot failures
 *
 * Records every repair as a HealEvent entity in the graph.
 *
 * Exit code 0 always — this hook never blocks.
 *
 * Usage:
 *   bun run hooks/tql-heal.ts              # Run as standalone health check
 *   Registered on post_cascade_response     # Periodic auto-check
 */

import { createKernel, PROJECT_ROOT, TRELLIS_HQ_DIR, OPS_PATH, WORKSPACE_PATH, HQ_REL_PATH } from './_kernel.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { resolve } from 'path';

// ── Types ──────────────────────────────────────────────────────────────

interface HookInput {
  agent_action_name: string;
  tool_info: Record<string, any>;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

export interface HealResult {
  issue: string;
  action: string;
  success: boolean;
  detail?: string;
}

// ── Health Checks ──────────────────────────────────────────────────────

export function checkDirectoryExists(hqDir: string = TRELLIS_HQ_DIR): HealResult | null {
  if (!existsSync(hqDir)) {
    try {
      mkdirSync(hqDir, { recursive: true });
      return {
        issue: `${HQ_REL_PATH}/ directory missing`,
        action: `Created ${HQ_REL_PATH}/ directory`,
        success: true,
      };
    } catch (err) {
      return {
        issue: `${HQ_REL_PATH}/ directory missing`,
        action: `Failed to create ${HQ_REL_PATH}/ directory`,
        success: false,
        detail: String(err),
      };
    }
  }
  return null;
}

export function checkWorkspaceJson(wsPath: string = WORKSPACE_PATH): HealResult | null {
  if (!existsSync(wsPath)) {
    try {
      const defaultWorkspace = {
        workspace: {
          name: 'trellis-client',
          description: 'Auto-regenerated workspace config',
        },
      };
      writeFileSync(wsPath, JSON.stringify(defaultWorkspace, null, 2), 'utf-8');
      return {
        issue: 'workspace.json missing',
        action: 'Regenerated minimal workspace.json',
        success: true,
      };
    } catch (err) {
      return {
        issue: 'workspace.json missing',
        action: 'Failed to regenerate workspace.json',
        success: false,
        detail: String(err),
      };
    }
  }

  // Validate JSON
  try {
    JSON.parse(readFileSync(wsPath, 'utf-8'));
  } catch {
    try {
      const defaultWorkspace = {
        workspace: {
          name: 'trellis-client',
          description: 'Auto-regenerated workspace config (previous was corrupted)',
        },
      };
      writeFileSync(wsPath, JSON.stringify(defaultWorkspace, null, 2), 'utf-8');
      return {
        issue: 'workspace.json corrupted (invalid JSON)',
        action: 'Replaced with minimal workspace.json',
        success: true,
      };
    } catch (err) {
      return {
        issue: 'workspace.json corrupted',
        action: 'Failed to replace workspace.json',
        success: false,
        detail: String(err),
      };
    }
  }

  return null;
}

export function checkOpsJsonl(opsPath: string = OPS_PATH): HealResult | null {
  if (!existsSync(opsPath)) {
    // Not an error — just means no ops yet. Create empty file.
    try {
      writeFileSync(opsPath, '', 'utf-8');
      return {
        issue: 'ops.jsonl missing',
        action: 'Created empty ops.jsonl',
        success: true,
      };
    } catch (err) {
      return {
        issue: 'ops.jsonl missing',
        action: 'Failed to create ops.jsonl',
        success: false,
        detail: String(err),
      };
    }
  }

  // Check for corruption (invalid JSON lines)
  try {
    const content = readFileSync(opsPath, 'utf-8').trim();
    if (!content) return null; // Empty is fine

    const lines = content.split('\n');
    let corruptLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;
      try {
        JSON.parse(line);
      } catch {
        corruptLine = i + 1;
        break;
      }
    }

    if (corruptLine > 0) {
      // Try to restore from snapshot
      const snapshotPath = opsPath.replace(/\.jsonl$/, '.snapshot.json');
      if (existsSync(snapshotPath)) {
        // Backup the corrupted file
        const backupPath = `${opsPath}.corrupt.${Date.now()}`;
        copyFileSync(opsPath, backupPath);
        // Truncate ops — snapshot will be the new baseline
        writeFileSync(opsPath, '', 'utf-8');
        return {
          issue: `ops.jsonl corrupted at line ${corruptLine}`,
          action: `Backed up to ${backupPath}, truncated ops.jsonl (snapshot will restore state)`,
          success: true,
        };
      } else {
        // No snapshot — keep only valid lines
        const validLines = lines
          .filter((line) => {
            if (!line.trim()) return false;
            try { JSON.parse(line); return true; } catch { return false; }
          })
          .join('\n');
        writeFileSync(opsPath, validLines + (validLines ? '\n' : ''), 'utf-8');
        const removed = lines.length - validLines.split('\n').filter(Boolean).length;
        return {
          issue: `ops.jsonl corrupted at line ${corruptLine}`,
          action: `Removed ${removed} corrupted line(s), kept ${validLines.split('\n').filter(Boolean).length} valid ops`,
          success: true,
        };
      }
    }
  } catch (err) {
    return {
      issue: 'ops.jsonl unreadable',
      action: 'Failed to check ops.jsonl',
      success: false,
      detail: String(err),
    };
  }

  return null;
}

function checkKernelBoot(): HealResult | null {
  if (!existsSync(OPS_PATH)) return null; // Can't test boot without ops file

  try {
    const kernel = createKernel();
    const stats = kernel.getStore().getStats();
    kernel.close();

    // Sanity check — if we had ops but no entities, something is wrong
    if (stats.totalFacts === 0 && readFileSync(OPS_PATH, 'utf-8').trim().length > 0) {
      return {
        issue: 'Kernel booted but store is empty despite non-empty ops.jsonl',
        action: 'Logged anomaly — may need manual investigation',
        success: false,
        detail: `ops.jsonl has content but store has 0 facts after replay`,
      };
    }

    return null;
  } catch (err) {
    return {
      issue: 'Kernel boot failure',
      action: 'Kernel failed to initialize',
      success: false,
      detail: String(err),
    };
  }
}

// ── Record Heal Event ──────────────────────────────────────────────────

function recordHealEvents(results: HealResult[], sessionId?: string): void {
  if (results.length === 0) return;

  try {
    const kernel = createKernel();
    const now = new Date().toISOString();

    for (const result of results) {
      const healId = `heal:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      kernel.createNode(healId, {
        issue: result.issue,
        repairAction: result.action,
        result: result.success ? 'repaired' : 'failed',
        detail: result.detail || '',
        timestamp: now,
      }, 'HealEvent');

      if (sessionId) {
        kernel.link(healId, 'triggeredBy', sessionId);
      }
    }

    kernel.close();
  } catch {
    // If we can't record to the graph, just log to stdout
    // (don't let recording failures cascade)
  }
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  // Parse input if available (when called as a hook)
  let sessionId: string | undefined;
  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) {
      const input: HookInput = JSON.parse(raw);
      sessionId = `session:${input.trajectory_id}`;
    }
  } catch {
    // Running standalone — no input
  }

  const results: HealResult[] = [];

  // Run health checks in order
  const dirResult = checkDirectoryExists();
  if (dirResult) results.push(dirResult);

  const wsResult = checkWorkspaceJson();
  if (wsResult) results.push(wsResult);

  const opsResult = checkOpsJsonl();
  if (opsResult) results.push(opsResult);

  const bootResult = checkKernelBoot();
  if (bootResult) results.push(bootResult);

  // Report
  if (results.length === 0) {
    console.log('[HQ Heal] ✓ All systems healthy');
    process.exit(0);
  }

  for (const r of results) {
    const icon = r.success ? '⚕' : '✗';
    console.log(`[HQ Heal] ${icon} ${r.issue}`);
    console.log(`  → ${r.action}`);
    if (r.detail) console.log(`  → Detail: ${r.detail}`);
  }

  // Record repairs to the graph
  recordHealEvents(results, sessionId);

  const repaired = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`\n[HQ Heal] ${repaired} repaired, ${failed} unresolved`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[HQ Heal] Error:', err);
  process.exit(0); // Never block
});

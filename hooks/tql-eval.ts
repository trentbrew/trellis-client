#!/usr/bin/env bun

/**
 * TQL Eval Hook — Real-time spiral detection and agent alignment.
 *
 * Registered on post_run_command and post_cascade_response.
 * Queries recent session actions from the kernel and applies heuristics
 * to detect behavioral spirals (failure chains, dep installs, retry loops).
 *
 * When a spiral is detected:
 *   - Outputs a nudge message (exit 0 — not a block)
 *   - Writes an Eval entity to the kernel
 *   - Promotes recurring patterns to Pattern entities
 *
 * Exit code 0 always — this hook never blocks.
 */

import { TrellisKernel } from '../tql/kernel/trellis-kernel.js';
import { createKernel, OPS_PATH } from './_kernel.js';
import { existsSync } from 'fs';

// ── Types ──────────────────────────────────────────────────────────────

interface HookInput {
  agent_action_name: string;
  tool_info: Record<string, any>;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

interface SpiralDetection {
  pattern: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion: string;
  actionCount: number;
  trigger: string;
}

// ── Paths ──────────────────────────────────────────────────────────────


// ── Spiral Detection Heuristics ────────────────────────────────────────

const DEP_INSTALL_PATTERN = /\b(bun\s+add|npm\s+install|yarn\s+add|pip\s+install|pip3\s+install)\b/;
const RETRY_SIMILARITY_THRESHOLD = 0.8;

function detectSpirals(actions: Record<string, unknown>[]): SpiralDetection[] {
  const detections: SpiralDetection[] = [];

  if (actions.length < 3) return detections;

  // Sort by timestamp descending (most recent first)
  const sorted = [...actions].sort((a, b) => {
    const ta = String(a['?a.timestamp'] || '');
    const tb = String(b['?a.timestamp'] || '');
    return tb.localeCompare(ta);
  });

  // Take the last N actions for analysis
  const recent = sorted.slice(0, 20);
  const commands = recent
    .filter(a => {
      const data = String(a['?a.data'] || '');
      return data.includes('command');
    })
    .map(a => {
      try {
        const data = JSON.parse(String(a['?a.data'] || '{}'));
        return {
          command: data.command || '',
          exitCode: data.exitCode,
          timestamp: String(a['?a.timestamp'] || ''),
          actionType: String(a['?a.actionType'] || ''),
        };
      } catch {
        return { command: '', exitCode: undefined, timestamp: '', actionType: '' };
      }
    })
    .filter(c => c.command);

  // 1. Failure chain: 3+ consecutive non-zero exit codes
  let consecutiveFailures = 0;
  const failedCommands: string[] = [];
  for (const cmd of commands) {
    if (cmd.exitCode !== undefined && cmd.exitCode !== 0 && cmd.exitCode !== null) {
      consecutiveFailures++;
      failedCommands.push(cmd.command);
    } else {
      break; // Stop at first success (most recent first)
    }
  }

  if (consecutiveFailures >= 3) {
    detections.push({
      pattern: 'failure-chain',
      severity: consecutiveFailures >= 5 ? 'critical' : 'warning',
      message: `${consecutiveFailures} consecutive command failures detected`,
      suggestion: 'Step back and re-assess. Check if prerequisites are missing or the approach is wrong.',
      actionCount: consecutiveFailures,
      trigger: failedCommands.slice(0, 3).join(' | '),
    });
  }

  // 2. Dep spiral: 3+ package install commands in recent window
  const depInstalls = commands.filter(c => DEP_INSTALL_PATTERN.test(c.command));
  if (depInstalls.length >= 3) {
    const packages = depInstalls.map(c => {
      // Extract package name from install command
      const match = c.command.match(/(?:add|install)\s+(.+?)(\s|$)/);
      return match ? match[1] : c.command;
    });
    detections.push({
      pattern: 'dep-install-chain',
      severity: depInstalls.length >= 5 ? 'critical' : 'warning',
      message: `${depInstalls.length} sequential package installs detected`,
      suggestion: `Installing dependencies one-by-one is a spiral. Batch them: check package.json or install all at once.`,
      actionCount: depInstalls.length,
      trigger: packages.join(', '),
    });
  }

  // 3. Retry loop: same or near-identical command repeated 3+ times
  const cmdCounts = new Map<string, number>();
  for (const cmd of commands.slice(0, 10)) {
    // Normalize command for comparison (trim whitespace, collapse spaces)
    const normalized = cmd.command.trim().replace(/\s+/g, ' ');
    cmdCounts.set(normalized, (cmdCounts.get(normalized) || 0) + 1);
  }

  for (const [cmd, count] of cmdCounts) {
    if (count >= 3) {
      detections.push({
        pattern: 'retry-loop',
        severity: count >= 5 ? 'critical' : 'warning',
        message: `Command repeated ${count} times: "${cmd.slice(0, 80)}"`,
        suggestion: 'This command keeps failing. Try a different approach instead of retrying.',
        actionCount: count,
        trigger: cmd.slice(0, 120),
      });
    }
  }

  // 4. Workaround cascade: detecting multiple distinct approaches
  // Look for commands targeting the same file or resource with different tools
  const targetFiles = new Map<string, Set<string>>();
  for (const cmd of commands.slice(0, 15)) {
    // Extract file paths from commands
    const pathMatches = cmd.command.match(/[\w\-./]+\.(json|ts|js|vue|css|md)/g);
    if (pathMatches) {
      for (const path of pathMatches) {
        if (!targetFiles.has(path)) targetFiles.set(path, new Set());
        // Extract the tool/approach used
        const tool = cmd.command.split(/\s+/)[0] || '';
        targetFiles.get(path)!.add(tool);
      }
    }
  }

  for (const [file, tools] of targetFiles) {
    if (tools.size >= 3) {
      detections.push({
        pattern: 'workaround-cascade',
        severity: 'warning',
        message: `${tools.size} different approaches tried for "${file}"`,
        suggestion: `Multiple tools targeting the same resource suggests a deeper issue. Re-assess the root cause.`,
        actionCount: tools.size,
        trigger: `${file} via ${[...tools].join(', ')}`,
      });
    }
  }

  return detections;
}

// ── Eval Entity Writer ─────────────────────────────────────────────────

async function writeEvalEntity(
  kernel: TrellisKernel,
  sessionId: string,
  detection: SpiralDetection,
): Promise<void> {
  const evalId = `eval:${sessionId}:${detection.pattern}:${Date.now()}`;
  try {
    await kernel.createNode(evalId, {
      sessionId,
      pattern: detection.pattern,
      severity: detection.severity,
      actionCount: detection.actionCount,
      trigger: detection.trigger,
      message: detection.message,
      suggestion: detection.suggestion,
      resolution: '', // Populated later if the spiral is resolved
      timestamp: new Date().toISOString(),
    }, 'Eval');
  } catch {
    // Best-effort — don't fail the hook on write errors
  }
}

// ── Pattern Promotion ──────────────────────────────────────────────────

async function checkPatternPromotion(
  kernel: TrellisKernel,
  detection: SpiralDetection,
): Promise<void> {
  try {
    // Count existing Eval entities with the same pattern name
    const result = kernel.query(
      `FIND Eval AS ?e WHERE ?e.pattern = "${detection.pattern}" RETURN ?e.pattern`
    );
    const resolved = result instanceof Promise ? await result : result;
    const occurrences = resolved.rows.length;

    if (occurrences >= 2) {
      // Check if a Pattern entity already exists
      const patternId = `pattern:${detection.pattern}`;
      const existing = kernel.getStore().getFactsByEntity(patternId);

      if (existing.length === 0) {
        // Promote to durable Pattern
        await kernel.createNode(patternId, {
          name: detection.pattern,
          description: detection.message,
          trigger: detection.trigger,
          fix: detection.suggestion,
          occurrences,
          lastSeen: new Date().toISOString(),
        }, 'Pattern');
        console.log(`[TQL Eval] 📚 New pattern learned: "${detection.pattern}" (${occurrences} occurrences)`);
      } else {
        // Update occurrence count
        await kernel.updateNode(patternId, {
          ...Object.fromEntries(existing.filter(f => f.a !== 'type').map(f => [f.a, f.v])),
          occurrences,
          lastSeen: new Date().toISOString(),
        }, 'Pattern');
      }
    }
  } catch {
    // Best-effort — don't fail on promotion errors
  }
}

// ── Output Formatting ──────────────────────────────────────────────────

function formatNudge(detection: SpiralDetection): string {
  const icon = detection.severity === 'critical' ? '🔴' : '⚠';
  const lines = [
    `[TQL Eval] ${icon} SPIRAL DETECTED: ${detection.pattern} (${detection.actionCount} actions)`,
    `  → ${detection.message}`,
    `  → Suggestion: ${detection.suggestion}`,
  ];
  if (detection.trigger) {
    lines.push(`  → Trigger: ${detection.trigger.slice(0, 150)}`);
  }
  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const raw = await Bun.stdin.text();

  let input: HookInput;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    // Can't parse input — exit silently
    process.exit(0);
  }

  // Only analyze if we have a kernel
  if (!existsSync(OPS_PATH)) {
    process.exit(0);
  }

  let kernel: TrellisKernel | null = null;

  try {
    kernel = createKernel();

    const sessionId = `session:${input.trajectory_id}`;

    // Query recent actions for this session
    const result = kernel.query(
      `FIND Action AS ?a RETURN ?a.actionType, ?a.timestamp, ?a.data ORDER BY ?a.timestamp DESC LIMIT 25`
    );
    const resolved = result instanceof Promise ? await result : result;

    if (resolved.rows.length < 3) {
      // Not enough data to evaluate
      process.exit(0);
    }

    // Run spiral detection
    const detections = detectSpirals(resolved.rows);

    if (detections.length > 0) {
      // Output nudges (most severe first)
      const sorted = detections.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      for (const detection of sorted) {
        console.log(formatNudge(detection));

        // Write eval entity and check for pattern promotion
        await writeEvalEntity(kernel, sessionId, detection);
        await checkPatternPromotion(kernel, detection);
      }
    }
  } catch (err) {
    // Eval hook should never cause issues — fail silently
    console.error(`[TQL Eval] Warning: ${err}`);
  } finally {
    kernel?.close();
  }

  process.exit(0);
}

main();

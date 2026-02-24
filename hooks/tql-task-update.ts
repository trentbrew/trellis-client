#!/usr/bin/env bun

/**
 * TQL Task Update — auto-transitions task status based on Cascade activity.
 *
 * Registered on post_cascade_response.
 * Analyzes the response for signals (file writes, test passes, completion keywords)
 * and updates task status in the live Trellis graph accordingly.
 *
 * Behavior:
 *   - First code write in a session → transition active task to "in-progress"
 *   - Completion signals in response → suggest marking task done (nudge only)
 *   - Never auto-marks tasks as "done" — that's the user's call
 *
 * Exit code 0 always — this hook never blocks.
 */

// ── Types ──────────────────────────────────────────────────────────────

interface HookInput {
  agent_action_name: string;
  tool_info: Record<string, any>;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

interface TaskRow {
  '?e.title'?: string;
  '?e.taskStatus'?: string;
  '?e'?: string;
}

// ── Config ─────────────────────────────────────────────────────────────

const TRELLIS_PORT = process.env.TRELLIS_PORT || '1414';
const API_BASE = `http://localhost:${TRELLIS_PORT}/api/graph`;
const TIMEOUT_MS = 2000;
const AGENT_ID = process.env.TRELLIS_AGENT_ID || 'cascade-hooks';

// ── Helpers ────────────────────────────────────────────────────────────

async function queryGraph(eqls: string): Promise<TaskRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: eqls }),
      signal: controller.signal,
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function mutateGraph(action: Record<string, any>): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/mutate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...action, agentId: AGENT_ID }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ── Signal Detection ──────────────────────────────────────────────────

const COMPLETION_SIGNALS = [
  /\ball\s+(done|complete|finished|implemented|working)\b/i,
  /\bsuccessfully\s+(tested|verified|deployed|implemented)\b/i,
  /\btask\s+(complete|done|finished)\b/i,
  /\bimplementation\s+(complete|done|finished)\b/i,
  /\beverything\s+(works|passes|is working)\b/i,
];

const CODE_WRITE_SIGNALS = [
  /created\s+file/i,
  /\bedited?\b.*\bfile/i,
  /\bwrote\b.*\bto\b/i,
  /\bmodified\b/i,
  /\bupdated\b.*\bfile/i,
];

function hasCompletionSignal(response: string): boolean {
  return COMPLETION_SIGNALS.some(p => p.test(response));
}

function hasCodeWriteSignal(response: string): boolean {
  return CODE_WRITE_SIGNALS.some(p => p.test(response));
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const raw = await Bun.stdin.text();

  let input: HookInput;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (input.agent_action_name !== 'post_cascade_response') {
    process.exit(0);
  }

  const response = input.tool_info.response || '';
  if (!response) {
    process.exit(0);
  }

  // Find pending tasks that should transition to in-progress
  if (hasCodeWriteSignal(response)) {
    const pending = await queryGraph(
      'FIND entity AS ?e WHERE ?e.type = "task" AND ?e.taskStatus = "pending" RETURN ?e.title, ?e LIMIT 1'
    );

    // Only auto-transition if there are NO in-progress tasks already
    const inProgress = await queryGraph(
      'FIND entity AS ?e WHERE ?e.type = "task" AND ?e.taskStatus = "in-progress" RETURN ?e LIMIT 1'
    );

    if (pending.length > 0 && inProgress.length === 0) {
      const task = pending[0]!;
      const entityId = task['?e'];
      const title = task['?e.title'] || 'Untitled';

      if (entityId) {
        const ok = await mutateGraph({
          action: 'updateNode',
          entityId,
          type: 'entity',
          data: { taskStatus: 'in-progress' },
        });

        if (ok) {
          console.log(`[Task Update] "${title}" → in-progress (code activity detected)`);
        }
      }
    }
  }

  // Nudge (don't auto-complete) when completion signals detected
  if (hasCompletionSignal(response)) {
    const inProgress = await queryGraph(
      'FIND entity AS ?e WHERE ?e.type = "task" AND ?e.taskStatus = "in-progress" RETURN ?e.title LIMIT 3'
    );

    if (inProgress.length > 0) {
      const titles = inProgress.map(t => `"${t['?e.title'] || 'Untitled'}"`).join(', ');
      console.log(`[Task Update] Completion signal detected. Consider marking done: ${titles}`);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));

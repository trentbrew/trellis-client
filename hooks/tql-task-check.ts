#!/usr/bin/env bun

/**
 * TQL Task Check — surfaces the active task from the live Trellis graph.
 *
 * Registered on pre_user_prompt.
 * Queries the Nuxt dev server (localhost:$TRELLIS_PORT) for in-progress tasks
 * and outputs context so the agent knows what it should be working on.
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
  '?e.priority'?: string;
  '?e'?: string;
}

// ── Config ─────────────────────────────────────────────────────────────

const TRELLIS_PORT = process.env.TRELLIS_PORT || '1414';
const API_BASE = `http://localhost:${TRELLIS_PORT}/api/graph`;
const TIMEOUT_MS = 2000;

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

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  // Parse hook input (best-effort)
  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) JSON.parse(raw); // validate but don't need it
  } catch {
    // Running standalone or bad input — continue anyway
  }

  // Query for in-progress tasks
  const inProgress = await queryGraph(
    'FIND entity AS ?e WHERE ?e.type = "task" AND ?e.taskStatus = "in-progress" RETURN ?e.title, ?e.taskStatus, ?e.priority LIMIT 5'
  );

  if (inProgress.length > 0) {
    const tasks = inProgress
      .map(t => {
        const title = t['?e.title'] || 'Untitled';
        const priority = t['?e.priority'] ? ` [${t['?e.priority']}]` : '';
        return `  → "${title}"${priority}`;
      })
      .join('\n');
    console.log(`[Task Context] ${inProgress.length} active task(s):\n${tasks}`);
    process.exit(0);
  }

  // No in-progress tasks — check for pending ones
  const pending = await queryGraph(
    'FIND entity AS ?e WHERE ?e.type = "task" AND ?e.taskStatus = "pending" RETURN ?e.title, ?e.priority ORDER BY ?e.priority DESC LIMIT 3'
  );

  if (pending.length > 0) {
    const next = pending[0]!;
    const title = next['?e.title'] || 'Untitled';
    console.log(`[Task Context] No active task. Next up: "${title}" (${pending.length} pending)`);
  } else {
    console.log('[Task Context] No tasks found in graph.');
  }

  process.exit(0);
}

main().catch(() => process.exit(0));

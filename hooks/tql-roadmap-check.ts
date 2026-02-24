#!/usr/bin/env bun

/**
 * TQL Roadmap Check — surfaces milestone progress from the live Trellis graph.
 *
 * Registered on pre_user_prompt.
 * Queries the Nuxt dev server for milestones and task completion stats
 * to keep the agent aligned with the current roadmap.
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

// ── Config ─────────────────────────────────────────────────────────────

const PORT = process.env.TRELLIS_PORT || '1414';
const BASE = `http://localhost:${PORT}/api/graph`;
const TIMEOUT = 2000;

// ── Helpers ────────────────────────────────────────────────────────────

async function query(eqls: string): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(`${BASE}/query`, {
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
    if (raw.trim()) JSON.parse(raw);
  } catch {
    // Continue anyway
  }

  // Task status breakdown
  const allTasks = await query(
    'FIND entity AS ?e WHERE ?e.type = "task" RETURN ?e.taskStatus'
  );

  if (allTasks.length === 0) {
    // No tasks in graph — skip silently
    process.exit(0);
  }

  const statusCounts: Record<string, number> = {};
  for (const row of allTasks) {
    const status = String(row['?e.taskStatus'] || 'unset');
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  const done = statusCounts['done'] || statusCounts['completed'] || 0;
  const inProgress = statusCounts['in-progress'] || statusCounts['in_progress'] || 0;
  const pending = statusCounts['pending'] || statusCounts['todo'] || 0;
  const blocked = statusCounts['blocked'] || 0;
  const total = allTasks.length;

  // Build compact summary
  const parts: string[] = [];
  if (done > 0) parts.push(`${done} done`);
  if (inProgress > 0) parts.push(`${inProgress} active`);
  if (pending > 0) parts.push(`${pending} pending`);
  if (blocked > 0) parts.push(`${blocked} blocked`);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  console.log(`[Roadmap] ${total} tasks (${parts.join(', ')}) — ${pct}% complete`);

  // Check for milestones
  const milestones = await query(
    'FIND entity AS ?e WHERE ?e.type = "milestone" RETURN ?e.title, ?e.startDate, ?e.endDate, ?e.taskStatus LIMIT 5'
  );

  if (milestones.length > 0) {
    for (const m of milestones) {
      const title = m['?e.title'] || 'Untitled';
      const status = m['?e.taskStatus'] || 'active';
      const endDate = m['?e.endDate'] ? ` (due: ${m['?e.endDate']})` : '';
      console.log(`  → Milestone: "${title}" [${status}]${endDate}`);
    }
  }

  // Warn if too many tasks are in-progress simultaneously
  if (inProgress > 3) {
    console.log(`[Roadmap] ⚠ ${inProgress} tasks in-progress — consider focusing on fewer items`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));

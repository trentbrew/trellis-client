#!/usr/bin/env bun

/**
 * HQ Standup Generator — creates standup-ready notes from the knowledge graph.
 *
 * Usage:
 *   bun run hooks/tql-standup.ts             # Today's standup
 *   bun run hooks/tql-standup.ts 2026-02-07  # Standup for a specific date
 */

import { TrellisKernel } from '../tql/kernel/trellis-kernel.js';
import { createKernel, requireInit } from './_kernel.js';

async function safeQuery(kernel: TrellisKernel, q: string): Promise<Record<string, unknown>[]> {
  try {
    const result = kernel.query(q);
    const resolved = result instanceof Promise ? await result : result;
    return resolved.rows;
  } catch {
    return [];
  }
}

async function main() {
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0]!;

  requireInit();
  const kernel = createKernel();

  try {
    // What happened (completed tasks / changes)
    const changes = await safeQuery(kernel,
      'FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved, ?c.timestamp'
    );
    const sessions = await safeQuery(kernel,
      'FIND Session AS ?s RETURN ?s.trajectoryId, ?s.promptCount, ?s.intent'
    );
    const doneTasks = await safeQuery(kernel,
      'FIND Task AS ?t WHERE ?t.status = "done" RETURN ?t.title, ?t.priority'
    );

    // What's next (pending tasks sorted by priority)
    const pendingTasks = await safeQuery(kernel,
      'FIND Task AS ?t WHERE ?t.status = "pending" RETURN ?t.title, ?t.priority ORDER BY ?t.priority DESC LIMIT 5'
    );
    const inProgressTasks = await safeQuery(kernel,
      'FIND Task AS ?t WHERE ?t.status = "in_progress" RETURN ?t.title, ?t.priority'
    );

    // Blockers
    const blockedTasks = await safeQuery(kernel,
      'FIND Task AS ?t WHERE ?t.status = "blocked" RETURN ?t.title, ?t.priority'
    );

    // Unique files changed
    const uniqueFiles = new Set(changes.map(c => c['?c.filePath']));
    const totalAdded = changes.reduce((s, c) => s + (Number(c['?c.linesAdded']) || 0), 0);
    const totalRemoved = changes.reduce((s, c) => s + (Number(c['?c.linesRemoved']) || 0), 0);

    // Build output
    let md = `# Standup — ${targetDate}\n\n`;

    // Yesterday
    md += `**Yesterday:**`;
    if (doneTasks.length > 0) {
      md += ` Completed ${doneTasks.length} task(s): `;
      md += doneTasks.map(t => `"${t['?t.title']}"`).join(', ') + '.';
    }
    if (changes.length > 0) {
      md += ` Made ${changes.length} code change(s) across ${uniqueFiles.size} file(s) (+${totalAdded}/-${totalRemoved} lines).`;
    }
    if (sessions.length > 0) {
      md += ` ${sessions.length} Cascade session(s).`;
    }
    if (doneTasks.length === 0 && changes.length === 0) {
      md += ` No tracked activity.`;
    }
    md += '\n\n';

    // Today
    md += `**Today:**`;
    if (inProgressTasks.length > 0) {
      md += ` Continuing: `;
      md += inProgressTasks.map(t => `"${t['?t.title']}"`).join(', ') + '.';
    }
    if (pendingTasks.length > 0) {
      md += ` Queued: `;
      md += pendingTasks.map(t => `"${t['?t.title']}"`).join(', ') + '.';
    }
    if (inProgressTasks.length === 0 && pendingTasks.length === 0) {
      md += ` No tasks queued. Add tasks via the TQL kernel.`;
    }
    md += '\n\n';

    // Blockers
    md += `**Blockers:**`;
    if (blockedTasks.length > 0) {
      md += ` ${blockedTasks.length} blocked task(s): `;
      md += blockedTasks.map(t => `"${t['?t.title']}"`).join(', ') + '.';
    } else {
      md += ` None.`;
    }
    md += '\n';

    // Print to stdout
    console.log(md);
  } finally {
    kernel.close();
  }
}

main().catch((err) => {
  console.error('[HQ Standup] Error:', err);
  process.exit(1);
});

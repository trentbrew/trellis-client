#!/usr/bin/env bun

/**
 * HQ Status — terminal dashboard showing project state from the knowledge graph.
 *
 * Usage: bun run hooks/tql-status.ts
 */

import { TrellisKernel } from '../packages/tql/kernel/trellis-kernel.js';
import { createKernel, requireInit, PROJECT_ROOT } from './_kernel.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

async function safeQuery(kernel: TrellisKernel, q: string): Promise<Record<string, unknown>[]> {
  try {
    const result = kernel.query(q);
    const resolved = result instanceof Promise ? await result : result;
    return resolved.rows;
  } catch {
    return [];
  }
}

function progressBar(pct: number, width = 10): string {
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

async function main() {
  requireInit();
  const kernel = createKernel();

  try {
    const stats = kernel.getStore().getStats();

    // Entity type counts
    const typeFacts = kernel.getStore().getFactsByAttribute('type');
    const typeCounts: Record<string, number> = {};
    for (const fact of typeFacts) {
      const t = String(fact.v);
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    // Milestones
    const milestones = await safeQuery(kernel,
      'FIND Milestone AS ?m RETURN ?m.title, ?m.targetDate, ?m.completionPct, ?m.status ORDER BY ?m.targetDate ASC'
    );

    // Features by status
    const features = await safeQuery(kernel,
      'FIND Feature AS ?f RETURN ?f.title, ?f.status'
    );
    const featureStatusCounts: Record<string, number> = {};
    for (const f of features) {
      const s = String(f['?f.status'] || 'backlog');
      featureStatusCounts[s] = (featureStatusCounts[s] || 0) + 1;
    }

    // Tasks by status
    const tasks = await safeQuery(kernel,
      'FIND Task AS ?t RETURN ?t.title, ?t.status, ?t.priority ORDER BY ?t.priority DESC'
    );
    const taskStatusCounts: Record<string, number> = {};
    for (const t of tasks) {
      const s = String(t['?t.status'] || 'pending');
      taskStatusCounts[s] = (taskStatusCounts[s] || 0) + 1;
    }

    // Top files
    const topFiles = await safeQuery(kernel,
      'FIND File AS ?f WHERE ?f.writeCount > 0 RETURN ?f.path, ?f.writeCount, ?f.readCount ORDER BY ?f.writeCount DESC LIMIT 5'
    );

    // Next task
    const nextTasks = await safeQuery(kernel,
      'FIND Task AS ?t WHERE ?t.status = "pending" RETURN ?t.title, ?t.priority ORDER BY ?t.priority DESC LIMIT 1'
    );

    // Sessions & changes
    const sessions = await safeQuery(kernel,
      'FIND Session AS ?s RETURN ?s.trajectoryId'
    );
    const changes = await safeQuery(kernel,
      'FIND Change AS ?c RETURN ?c.filePath'
    );
    const commits = await safeQuery(kernel,
      'FIND Commit AS ?c RETURN ?c.hash'
    );

    const uniqueChangedFiles = new Set(changes.map(c => c['?c.filePath']));

    // Get project name from workspace.json
    let projectName = 'unknown';
    try {
      const ws = JSON.parse(await Bun.file(resolve(PROJECT_ROOT, '.tql', 'workspace.json')).text());
      projectName = ws.workspace?.name || 'unknown';
    } catch {}

    // Devlog check
    const today = new Date().toISOString().split('T')[0];
    const devlogExists = existsSync(resolve(PROJECT_ROOT, '.tql', 'devlog', `${today}.md`));

    // ── Render ────────────────────────────────────────────────────────

    console.log('');
    console.log(`HQ Status — ${projectName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Milestones
    if (milestones.length > 0) {
      for (const m of milestones) {
        const pct = Number(m['?m.completionPct'] || 0);
        const bar = progressBar(pct);
        const pctStr = `${Math.round(pct * 100)}%`;
        const target = m['?m.targetDate'] ? ` (target: ${m['?m.targetDate']})` : '';
        console.log(`Milestone:  ${m['?m.title']} [${bar}] ${pctStr}${target}`);
      }
    }

    // Features
    if (features.length > 0) {
      const parts = Object.entries(featureStatusCounts).map(([s, c]) => `${c} ${s}`).join(', ');
      console.log(`Features:   ${features.length} total (${parts})`);
    }

    // Tasks
    if (tasks.length > 0) {
      const parts = Object.entries(taskStatusCounts).map(([s, c]) => `${c} ${s}`).join(', ');
      console.log(`Tasks:      ${tasks.length} total (${parts})`);
    }

    // Core stats
    console.log(`Sessions:   ${sessions.length} conversations tracked`);
    console.log(`Changes:    ${changes.length} mutations across ${uniqueChangedFiles.size} files`);
    if (commits.length > 0) {
      console.log(`Commits:    ${commits.length} auto-tracked`);
    }

    // Top files
    if (topFiles.length > 0) {
      const topList = topFiles.map(f => `${f['?f.path']} (${f['?f.writeCount']})`).join(', ');
      console.log(`Top files:  ${topList}`);
    }

    // Next task
    if (nextTasks.length > 0) {
      const t = nextTasks[0]!;
      console.log(`Next up:    "${t['?t.title']}" (priority: ${t['?t.priority'] || 'unset'})`);
    }

    // Devlog
    if (devlogExists) {
      console.log(`Devlog:     .tql/devlog/${today}.md`);
    }

    // Graph stats
    console.log(`\nGraph:      ${stats.uniqueEntities} entities, ${stats.totalFacts} facts, ${stats.totalLinks} links`);

    // Entity type summary
    const typeList = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t}: ${c}`)
      .join(', ');
    console.log(`Types:      ${typeList}`);
    console.log('');
  } finally {
    kernel.close();
  }
}

main().catch((err) => {
  console.error('[HQ Status] Error:', err);
  process.exit(1);
});

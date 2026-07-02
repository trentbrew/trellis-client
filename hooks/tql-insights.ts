#!/usr/bin/env bun

/**
 * HQ Insights — auto-generated analytics from the knowledge graph.
 *
 * Surfaces patterns, hotspots, and trends without being asked.
 * Usage: bun run hooks/tql-insights.ts
 */

import { TrellisKernel } from '../packages/trellis-kernel/kernel/trellis-kernel.js';
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

interface Insight {
  category: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

async function main() {
  requireInit();
  const kernel = createKernel();

  const insights: Insight[] = [];

  try {
    const stats = kernel.getStore().getStats();

    // ── File Hotspots ────────────────────────────────────────────

    const files = await safeQuery(kernel,
      'FIND File AS ?f RETURN ?f.path, ?f.writeCount, ?f.readCount, ?f.language ORDER BY ?f.writeCount DESC LIMIT 50'
    );

    // Files with high write count (churn hotspots)
    const highChurnFiles = files.filter(f => Number(f['?f.writeCount'] || 0) >= 3);
    if (highChurnFiles.length > 0) {
      insights.push({
        category: 'Churn',
        title: `${highChurnFiles.length} high-churn file(s) detected`,
        detail: highChurnFiles.map(f => `  ${f['?f.path']} (${f['?f.writeCount']} writes)`).join('\n'),
        severity: highChurnFiles.length > 5 ? 'warning' : 'info',
      });
    }

    // Files read but never written (read-only dependencies?)
    const readOnlyFiles = files.filter(f =>
      Number(f['?f.readCount'] || 0) > 2 && Number(f['?f.writeCount'] || 0) === 0
    );
    if (readOnlyFiles.length > 0) {
      insights.push({
        category: 'Access Patterns',
        title: `${readOnlyFiles.length} frequently-read but never-modified file(s)`,
        detail: readOnlyFiles.slice(0, 5).map(f => `  ${f['?f.path']} (${f['?f.readCount']} reads)`).join('\n'),
        severity: 'info',
      });
    }

    // ── Language Distribution ─────────────────────────────────────

    const langCounts: Record<string, number> = {};
    for (const f of files) {
      const lang = String(f['?f.language'] || 'unknown');
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }

    const dominantLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0];
    if (dominantLang) {
      const pct = ((dominantLang[1] / files.length) * 100).toFixed(0);
      insights.push({
        category: 'Languages',
        title: `Dominant language: ${dominantLang[0]} (${pct}% of files)`,
        detail: Object.entries(langCounts).sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => `  ${lang}: ${count} files`).join('\n'),
        severity: 'info',
      });
    }

    // ── Session Patterns ─────────────────────────────────────────

    const sessions = await safeQuery(kernel,
      'FIND Session AS ?s RETURN ?s.trajectoryId, ?s.promptCount'
    );

    if (sessions.length > 0) {
      const totalPrompts = sessions.reduce((s, sess) => s + (Number(sess['?s.promptCount']) || 0), 0);
      const avgPrompts = totalPrompts / sessions.length;
      insights.push({
        category: 'Sessions',
        title: `${sessions.length} session(s), avg ${avgPrompts.toFixed(1)} prompts/session`,
        detail: `  Total prompts: ${totalPrompts}`,
        severity: 'info',
      });
    }

    // ── Change Patterns ──────────────────────────────────────────

    const changes = await safeQuery(kernel,
      'FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved'
    );

    if (changes.length > 0) {
      const totalAdded = changes.reduce((s, c) => s + (Number(c['?c.linesAdded']) || 0), 0);
      const totalRemoved = changes.reduce((s, c) => s + (Number(c['?c.linesRemoved']) || 0), 0);
      const netChange = totalAdded - totalRemoved;

      insights.push({
        category: 'Code Volume',
        title: `${changes.length} changes: +${totalAdded} / -${totalRemoved} lines (net: ${netChange > 0 ? '+' : ''}${netChange})`,
        detail: `  Ratio: ${totalRemoved > 0 ? (totalAdded / totalRemoved).toFixed(1) : '∞'}x add-to-remove`,
        severity: totalRemoved === 0 && totalAdded > 100 ? 'warning' : 'info',
      });

      // Files with only additions (no refactoring)
      const addOnlyChanges = changes.filter(c => Number(c['?c.linesRemoved'] || 0) === 0 && Number(c['?c.linesAdded'] || 0) > 0);
      if (addOnlyChanges.length > changes.length * 0.8 && changes.length > 5) {
        insights.push({
          category: 'Code Health',
          title: `${((addOnlyChanges.length / changes.length) * 100).toFixed(0)}% of changes are pure additions`,
          detail: '  Consider refactoring or removing unused code to maintain codebase health.',
          severity: 'warning',
        });
      }
    }

    // ── Dependency Analysis ──────────────────────────────────────

    const deps = await safeQuery(kernel,
      'FIND Dependency AS ?d RETURN ?d.name, ?d.version, ?d.depType'
    );

    if (deps.length > 0) {
      const devDeps = deps.filter(d => d['?d.depType'] === 'development');
      const prodDeps = deps.filter(d => d['?d.depType'] === 'production');
      insights.push({
        category: 'Dependencies',
        title: `${deps.length} total (${prodDeps.length} prod, ${devDeps.length} dev)`,
        detail: deps.map(d => `  ${d['?d.name']}@${d['?d.version']} (${d['?d.depType']})`).join('\n'),
        severity: deps.length > 50 ? 'warning' : 'info',
      });
    }

    // ── Task Health ──────────────────────────────────────────────

    const tasks = await safeQuery(kernel,
      'FIND Task AS ?t RETURN ?t.title, ?t.status, ?t.priority'
    );

    if (tasks.length > 0) {
      const blocked = tasks.filter(t => t['?t.status'] === 'blocked');
      if (blocked.length > 0) {
        insights.push({
          category: 'Blockers',
          title: `${blocked.length} blocked task(s)`,
          detail: blocked.map(t => `  "${t['?t.title']}"`).join('\n'),
          severity: blocked.length > 2 ? 'critical' : 'warning',
        });
      }
    }

    // ── Graph Health ─────────────────────────────────────────────

    const linkRatio = stats.totalLinks / Math.max(stats.uniqueEntities, 1);
    if (linkRatio < 0.5 && stats.uniqueEntities > 10) {
      insights.push({
        category: 'Graph Health',
        title: `Low link density: ${linkRatio.toFixed(2)} links/entity`,
        detail: `  ${stats.totalLinks} links across ${stats.uniqueEntities} entities. Graph connectivity could be improved.`,
        severity: 'info',
      });
    }

    // ── Agent Alignment (Evals & Patterns) ────────────────────────

    const evals = await safeQuery(kernel,
      'FIND Eval AS ?e RETURN ?e.pattern, ?e.severity, ?e.sessionId, ?e.trigger, ?e.timestamp'
    );

    if (evals.length > 0) {
      const bySeverity = { critical: 0, warning: 0, info: 0 };
      const byPattern = new Map<string, number>();
      for (const e of evals) {
        const sev = String(e['?e.severity'] || 'info') as keyof typeof bySeverity;
        if (sev in bySeverity) bySeverity[sev]++;
        const pat = String(e['?e.pattern'] || 'unknown');
        byPattern.set(pat, (byPattern.get(pat) || 0) + 1);
      }

      const topPatterns = [...byPattern.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p, c]) => `  ${p}: ${c} occurrence(s)`)
        .join('\n');

      insights.push({
        category: 'Agent Alignment',
        title: `${evals.length} spiral(s) detected (${bySeverity.critical} critical, ${bySeverity.warning} warnings)`,
        detail: topPatterns,
        severity: bySeverity.critical > 0 ? 'critical' : bySeverity.warning > 0 ? 'warning' : 'info',
      });
    }

    const patterns = await safeQuery(kernel,
      'FIND Pattern AS ?p RETURN ?p.name, ?p.occurrences, ?p.fix, ?p.lastSeen'
    );

    if (patterns.length > 0) {
      const patternList = patterns
        .map(p => `  "${p['?p.name']}": ${p['?p.occurrences']} hit(s) — fix: ${String(p['?p.fix'] || '(none)').slice(0, 80)}`)
        .join('\n');

      insights.push({
        category: 'Learned Patterns',
        title: `${patterns.length} durable pattern(s) in knowledge graph`,
        detail: patternList,
        severity: 'info',
      });
    }

    // ── Session Trajectory Scoring ────────────────────────────────

    if (sessions.length > 0) {
      const allActions = await safeQuery(kernel,
        'FIND Action AS ?a RETURN ?a.actionType, ?a.data, ?a.timestamp ORDER BY ?a.timestamp DESC LIMIT 100'
      );

      let failedCommands = 0;
      let totalCommands = 0;
      for (const a of allActions) {
        const data = String(a['?a.data'] || '');
        if (data.includes('"command"')) {
          totalCommands++;
          try {
            const parsed = JSON.parse(data);
            if (parsed.exitCode !== undefined && parsed.exitCode !== 0 && parsed.exitCode !== null) {
              failedCommands++;
            }
          } catch {}
        }
      }

      if (totalCommands > 5) {
        const failRate = ((failedCommands / totalCommands) * 100).toFixed(0);
        const severity = Number(failRate) > 50 ? 'critical' : Number(failRate) > 25 ? 'warning' : 'info';
        insights.push({
          category: 'Session Quality',
          title: `Command failure rate: ${failRate}% (${failedCommands}/${totalCommands})`,
          detail: severity !== 'info'
            ? `  High failure rate suggests the agent may be struggling. Consider reviewing approach.`
            : `  Healthy failure rate.`,
          severity,
        });
      }
    }

    // ── Render ───────────────────────────────────────────────────

    const severityIcon = { info: '●', warning: '▲', critical: '✖' };
    const severityColor = { info: '\x1b[36m', warning: '\x1b[33m', critical: '\x1b[31m' };
    const reset = '\x1b[0m';

    console.log('\nHQ Insights');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (insights.length === 0) {
      console.log('  No insights to report yet. Keep coding!\n');
    } else {
      // Group by category
      const byCategory: Record<string, Insight[]> = {};
      for (const i of insights) {
        if (!byCategory[i.category]) byCategory[i.category] = [];
        byCategory[i.category]!.push(i);
      }

      for (const [category, categoryInsights] of Object.entries(byCategory)) {
        console.log(`  ${category}`);
        for (const insight of categoryInsights) {
          const icon = severityIcon[insight.severity];
          const color = severityColor[insight.severity];
          console.log(`  ${color}${icon}${reset} ${insight.title}`);
          if (insight.detail) {
            for (const line of insight.detail.split('\n')) {
              console.log(`    ${line}`);
            }
          }
        }
        console.log('');
      }

      const critCount = insights.filter(i => i.severity === 'critical').length;
      const warnCount = insights.filter(i => i.severity === 'warning').length;
      const infoCount = insights.filter(i => i.severity === 'info').length;
      console.log(`  Summary: ${critCount} critical, ${warnCount} warnings, ${infoCount} info`);
    }

    console.log('');
  } finally {
    kernel.close();
  }
}

main().catch((err) => {
  console.error('[HQ Insights] Error:', err);
  process.exit(1);
});

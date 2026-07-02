#!/usr/bin/env bun

/**
 * HQ Export — exports kernel state to .tql/client/state.json for the frontend.
 *
 * Usage: bun run hooks/tql-export.ts
 */

import { TrellisKernel } from '../packages/trellis-kernel/kernel/trellis-kernel.js';
import { createKernel, requireInit, TQL_DIR } from './_kernel.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readFile, mkdir } from 'fs/promises';

const PROJECT_ROOT = resolve(import.meta.dir, '..');

const CLIENT_DIR = resolve(TQL_DIR, 'client');
const STATE_PATH = resolve(CLIENT_DIR, 'state.json');
const VUE_CLIENT_DIR = resolve(TQL_DIR, 'client-vue', 'public');
const VUE_STATE_PATH = resolve(VUE_CLIENT_DIR, 'state.json');
const GRAPH_PATH = resolve(TQL_DIR, 'graph.jsonld');

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
  requireInit();

  if (!existsSync(CLIENT_DIR)) {
    await mkdir(CLIENT_DIR, { recursive: true });
  }

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

    // Query each entity type
    const files = await safeQuery(kernel, 'FIND File AS ?f RETURN ?f.path, ?f.language, ?f.readCount, ?f.writeCount, ?f.size ORDER BY ?f.writeCount DESC');
    const changes = await safeQuery(kernel, 'FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved, ?c.timestamp');
    const sessions = await safeQuery(kernel, 'FIND Session AS ?s RETURN ?s.trajectoryId, ?s.startTime, ?s.promptCount, ?s.intent');
    const actions = await safeQuery(kernel, 'FIND Action AS ?a RETURN ?a.actionType, ?a.timestamp, ?a.executionId');
    const tasks = await safeQuery(kernel, 'FIND Task AS ?t RETURN ?t.title, ?t.status, ?t.priority');
    const features = await safeQuery(kernel, 'FIND Feature AS ?f RETURN ?f.title, ?f.status, ?f.priority, ?f.scope');
    const milestones = await safeQuery(kernel, 'FIND Milestone AS ?m RETURN ?m.title, ?m.targetDate, ?m.status, ?m.completionPct');
    const decisions = await safeQuery(kernel, 'FIND Decision AS ?d RETURN ?d.title, ?d.rationale, ?d.status');
    const dependencies = await safeQuery(kernel, 'FIND Dependency AS ?d RETURN ?d.name, ?d.version, ?d.depType');
    const commits = await safeQuery(kernel, 'FIND Commit AS ?c RETURN ?c.hash, ?c.message, ?c.timestamp, ?c.filesChanged');
    const conventions = await safeQuery(kernel, 'FIND Convention AS ?c RETURN ?c.name, ?c.rule');

    // Clean column names (strip ?x. prefix)
    function clean(rows: Record<string, unknown>[]): Record<string, unknown>[] {
      return rows.map(row => {
        const cleaned: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          const cleanKey = key.replace(/^\?[a-z]+\./, '');
          cleaned[cleanKey] = val;
        }
        return cleaned;
      });
    }

    // Language distribution
    const langCounts: Record<string, number> = {};
    for (const f of files) {
      const lang = String(f['?f.language'] || 'unknown');
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }

    // Action type distribution
    const actionCounts: Record<string, number> = {};
    for (const a of actions) {
      const t = String(a['?a.actionType'] || 'unknown');
      actionCounts[t] = (actionCounts[t] || 0) + 1;
    }

    // Task status distribution
    const taskStatusCounts: Record<string, number> = {};
    for (const t of tasks) {
      const s = String(t['?t.status'] || 'unknown');
      taskStatusCounts[s] = (taskStatusCounts[s] || 0) + 1;
    }

    // Read workspace metadata
    let workspaceMeta = { name: '', description: '' };
    const wsPath = resolve(TQL_DIR, 'workspace.json');
    if (existsSync(wsPath)) {
      try {
        const ws = JSON.parse(await readFile(wsPath, 'utf-8'));
        workspaceMeta = { name: ws.workspace?.name || '', description: ws.workspace?.description || '' };
      } catch { /* ignore */ }
    }

    // Read package.json metadata
    let pkgMeta = { version: '', scripts: [] as string[], dependencies: [] as string[], devDependencies: [] as string[] };
    const pkgPath = resolve(PROJECT_ROOT, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        pkgMeta = {
          version: pkg.version || '',
          scripts: Object.keys(pkg.scripts || {}),
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {}),
        };
      } catch { /* ignore */ }
    }

    const state = {
      exportedAt: new Date().toISOString(),
      project: {
        name: workspaceMeta.name,
        description: workspaceMeta.description,
        version: pkgMeta.version,
        scripts: pkgMeta.scripts,
        dependencies: pkgMeta.dependencies,
        devDependencies: pkgMeta.devDependencies,
      },
      stats,
      typeCounts,
      distributions: {
        languages: langCounts,
        actionTypes: actionCounts,
        taskStatuses: taskStatusCounts,
      },
      entities: {
        files: clean(files),
        changes: clean(changes),
        sessions: clean(sessions),
        actions: clean(actions),
        tasks: clean(tasks),
        features: clean(features),
        milestones: clean(milestones),
        decisions: clean(decisions),
        dependencies: clean(dependencies),
        commits: clean(commits),
        conventions: clean(conventions),
      },
    };

    // Merge tasks from graph.jsonld if it exists
    if (existsSync(GRAPH_PATH)) {
      try {
        const graphRaw = await readFile(GRAPH_PATH, 'utf-8');
        const graphDoc = JSON.parse(graphRaw);
        const graphNodes = (graphDoc['@graph'] || []) as Record<string, unknown>[];
        const graphTasks = graphNodes.filter((n: any) => n['@type'] === 'Task');
        const existingTitles = new Set((state.entities.tasks as any[]).map((t: any) => t.title));
        let merged = 0;
        for (const gt of graphTasks) {
          const title = gt.title as string;
          if (title && !existingTitles.has(title)) {
            const { '@id': _id, '@type': _type, createdAt, updatedAt, ...rest } = gt as any;
            state.entities.tasks.push({ ...rest, timestamp: createdAt || updatedAt });
            existingTitles.add(title);
            merged++;
          }
        }
        if (merged > 0) console.log(`  Merged ${merged} tasks from graph.jsonld`);
      } catch (e) {
        console.warn(`[HQ Export] Warning: could not merge graph.jsonld:`, e);
      }
    }

    const stateJson = JSON.stringify(state, null, 2);
    await Bun.write(STATE_PATH, stateJson);

    // Also write to Vue client if it exists
    if (existsSync(VUE_CLIENT_DIR)) {
      await Bun.write(VUE_STATE_PATH, stateJson);
      console.log(`[HQ Export] State exported to .tql/client/state.json + .tql/client-vue/public/state.json`);
    } else {
      console.log(`[HQ Export] State exported to .tql/client/state.json`);
    }
    console.log(`  Entities: ${stats.uniqueEntities} | Facts: ${stats.totalFacts} | Links: ${stats.totalLinks}`);
  } finally {
    kernel.close();
  }
}

main().catch((err) => {
  console.error('[HQ Export] Error:', err);
  process.exit(1);
});

#!/usr/bin/env bun

/**
 * HQ Seed — populates the knowledge graph with project tasks, features, milestones.
 *
 * Usage: bun run hooks/tql-seed.ts
 */

import { createKernel, requireInit, WORKSPACE_PATH } from './_kernel.js';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

async function main() {
  requireInit();
  const kernel = createKernel();

  const workspaceConfig = JSON.parse(await readFile(WORKSPACE_PATH, 'utf-8'));
  await kernel.boot(workspaceConfig);

  // ── Milestones ─────────────────────────────────────────────────

  const milestones = [
    { id: 'milestone:alpha', title: 'Alpha — Core Graph + Hooks', targetDate: '2026-02-07', status: 'done', completionPct: 1.0 },
    { id: 'milestone:beta', title: 'Beta — Realtime Dashboard + API', targetDate: '2026-02-14', status: 'in_progress', completionPct: 0.3 },
    { id: 'milestone:v1', title: 'v1.0 — Production-Ready HQ', targetDate: '2026-03-01', status: 'planned', completionPct: 0.0 },
  ];

  for (const m of milestones) {
    await kernel.createNode(m.id, {
      title: m.title,
      targetDate: m.targetDate,
      status: m.status,
      completionPct: m.completionPct,
    }, 'Milestone');
  }
  console.log(`  Milestones: ${milestones.length}`);

  // ── Features ───────────────────────────────────────────────────

  const features = [
    { id: 'feature:ingest', title: 'Event Ingestion Pipeline', status: 'done', priority: 'high', scope: 'core' },
    { id: 'feature:guard', title: 'Policy Guard System', status: 'done', priority: 'high', scope: 'core' },
    { id: 'feature:devlog', title: 'Auto-Generated Devlogs', status: 'done', priority: 'medium', scope: 'docs' },
    { id: 'feature:autodocs', title: 'Auto-Generated Docs (CHANGELOG, SPEC, ADRs)', status: 'done', priority: 'medium', scope: 'docs' },
    { id: 'feature:standup', title: 'Standup & Demo Script Generator', status: 'done', priority: 'medium', scope: 'reports' },
    { id: 'feature:git', title: 'Git Integration & Auto-Commit', status: 'done', priority: 'medium', scope: 'core' },
    { id: 'feature:dashboard', title: 'Web Dashboard Client', status: 'in_progress', priority: 'high', scope: 'client' },
    { id: 'feature:realtime', title: 'Realtime WebSocket Bridge', status: 'in_progress', priority: 'high', scope: 'client' },
    { id: 'feature:api', title: 'Local Kernel API Server', status: 'planned', priority: 'high', scope: 'client' },
    { id: 'feature:kanban-crud', title: 'Kanban Drag-and-Drop CRUD', status: 'planned', priority: 'medium', scope: 'client' },
    { id: 'feature:inbox', title: 'Dashboard → Cascade Intent Inbox', status: 'planned', priority: 'medium', scope: 'bridge' },
    { id: 'feature:nl-query', title: 'Natural Language Graph Queries', status: 'backlog', priority: 'low', scope: 'ai' },
    { id: 'feature:ai-insights', title: 'AI-Powered Insight Generation', status: 'backlog', priority: 'low', scope: 'ai' },
  ];

  for (const f of features) {
    await kernel.createNode(f.id, {
      title: f.title,
      status: f.status,
      priority: f.priority,
      scope: f.scope,
    }, 'Feature');
  }
  console.log(`  Features: ${features.length}`);

  // ── Tasks ──────────────────────────────────────────────────────

  const tasks = [
    // Done
    { id: 'task:scaffold', title: 'Scaffold .tql/ directory', status: 'done', priority: 'high', feature: 'feature:ingest',
      description: 'Create the .tql/ directory structure with workspace.json, store.db, and client/ folder.',
      acceptanceCriteria: '- [x] .tql/ directory created at project root\n- [x] workspace.json initialized with entity types\n- [x] store.db created with SQLite backend\n- [x] client/ directory ready for dashboard' },
    { id: 'task:workspace-schema', title: 'Define workspace.json schema', status: 'done', priority: 'high', feature: 'feature:ingest',
      description: 'Design and implement the workspace.json schema that defines entity types, projections, and configuration.',
      acceptanceCriteria: '- [x] 12 entity types defined\n- [x] 5 projections configured\n- [x] Schema validated on boot' },
    { id: 'task:ingest-hook', title: 'Implement tql-ingest.ts hook', status: 'done', priority: 'high', feature: 'feature:ingest',
      description: 'Core hook that receives all Cascade events via stdin and routes them to appropriate graph mutations.',
      acceptanceCriteria: '- [x] Parses JSON from stdin\n- [x] Routes events by agent_action_name\n- [x] Creates entities for files, actions, sessions\n- [x] Handles all hook event types' },
    { id: 'task:init-script', title: 'Implement tql-init.ts bootstrap', status: 'done', priority: 'high', feature: 'feature:ingest',
      description: 'Bootstrap script that scans the project filesystem, reads dependencies, and seeds the initial graph state.',
      acceptanceCriteria: '- [x] Scans project files recursively\n- [x] Detects languages from extensions\n- [x] Reads package.json dependencies\n- [x] Reads git log for initial commits' },
    { id: 'task:guard-patterns', title: 'Implement pattern-based guard rules', status: 'done', priority: 'high', feature: 'feature:guard',
      description: 'Pattern matching guard that blocks dangerous commands and enforces naming conventions.',
      acceptanceCriteria: '- [x] Blocks rm -rf, DROP TABLE, etc.\n- [x] Configurable pattern list\n- [x] Returns exit code 2 to block execution' },
    { id: 'task:guard-policies', title: 'Implement EQL-S policy evaluation', status: 'done', priority: 'medium', feature: 'feature:guard',
      description: 'Declarative policy engine using EQL-S queries to enforce graph-level constraints.',
      acceptanceCriteria: '- [x] Parses .tql/policies.eqls file\n- [x] Evaluates EQL-S queries against live graph\n- [x] Blocks on policy violation\n- [x] Reports which policy failed' },
    { id: 'task:devlog-gen', title: 'Build devlog generator', status: 'done', priority: 'medium', feature: 'feature:devlog',
      description: 'Generates daily narrative devlog summaries from the action and change history in the graph.',
      acceptanceCriteria: '- [x] Groups events by day\n- [x] Generates markdown narrative\n- [x] Writes to .tql/devlogs/' },
    { id: 'task:docs-gen', title: 'Build auto-docs generator', status: 'done', priority: 'medium', feature: 'feature:autodocs',
      description: 'Auto-generates CHANGELOG, DECISIONS, ROADMAP, SPEC, and CONVENTIONS docs from graph state.',
      acceptanceCriteria: '- [x] CHANGELOG from changes\n- [x] DECISIONS from Decision entities\n- [x] ROADMAP from milestones + features\n- [x] SPEC from entity types + stats\n- [x] CONVENTIONS from Convention entities' },
    { id: 'task:standup-gen', title: 'Build standup generator', status: 'done', priority: 'medium', feature: 'feature:standup',
      description: 'Generates standup notes summarizing recent activity, blockers, and upcoming work.' },
    { id: 'task:demo-gen', title: 'Build demo script generator', status: 'done', priority: 'medium', feature: 'feature:standup',
      description: 'Generates client demo scripts highlighting completed features and project progress.' },
    { id: 'task:git-sync', title: 'Implement git commit sync', status: 'done', priority: 'medium', feature: 'feature:git',
      description: 'Syncs git commits into the knowledge graph as Commit entities with metadata.' },
    { id: 'task:git-autocommit', title: 'Implement auto-commit for .tql/', status: 'done', priority: 'low', feature: 'feature:git',
      description: 'Auto-commits changes to .tql/ directory after significant graph mutations.' },
    { id: 'task:static-dashboard', title: 'Build static HTML dashboard', status: 'done', priority: 'high', feature: 'feature:dashboard',
      description: 'Single-file static dashboard with tabs for Dashboard, Kanban, Files, Activity, and Roadmap.',
      acceptanceCriteria: '- [x] TailwindCSS dark theme\n- [x] 5 views implemented\n- [x] Loads from state.json\n- [x] Bar charts for entity distributions' },
    { id: 'task:export-state', title: 'Build state export script', status: 'done', priority: 'high', feature: 'feature:dashboard',
      description: 'Exports kernel state to a JSON file that the static dashboard can consume.' },

    // In progress
    { id: 'task:kanban-ui', title: 'Populate kanban with real data', status: 'in_progress', priority: 'high', feature: 'feature:dashboard',
      description: 'Seed the kernel with realistic task data so the kanban board shows populated columns.',
      acceptanceCriteria: '- [x] Seed script creates tasks across all statuses\n- [x] Tasks linked to features\n- [ ] Acceptance criteria visible in task details\n- [ ] Description shown on hover or click' },
    { id: 'task:ws-server', title: 'Build WebSocket bridge server', status: 'in_progress', priority: 'high', feature: 'feature:realtime',
      description: 'Bun server that exposes WebSocket for live event broadcasting from hooks to connected dashboard clients.',
      acceptanceCriteria: '- [x] WebSocket endpoint at /ws\n- [x] Broadcasts hook events to all clients\n- [x] Auto-reconnect on disconnect\n- [ ] Connection health monitoring' },

    // Pending
    { id: 'task:api-endpoints', title: 'Implement kernel API endpoints (CRUD)', status: 'pending', priority: 'high', feature: 'feature:api',
      description: 'REST API endpoints for creating, reading, updating, and deleting tasks, features, and milestones.',
      acceptanceCriteria: '- [ ] GET /api/state returns full state\n- [ ] POST /api/tasks creates a task\n- [ ] PUT /api/tasks/:id updates a task\n- [ ] GET /api/query runs EQL-S queries\n- [ ] CORS enabled for local dev' },
    { id: 'task:dash-mutations', title: 'Add mutation UI to dashboard', status: 'pending', priority: 'high', feature: 'feature:kanban-crud',
      description: 'Dashboard UI for creating and editing tasks, including task detail modal with acceptance criteria.',
      acceptanceCriteria: '- [ ] Task creation form at top of kanban\n- [ ] Click task card to open detail modal\n- [ ] Edit title, status, priority, description, AC\n- [ ] Save changes persist to kernel' },
    { id: 'task:drag-drop', title: 'Implement kanban drag-and-drop', status: 'pending', priority: 'medium', feature: 'feature:kanban-crud',
      description: 'Enable drag-and-drop to move tasks between kanban columns.',
      acceptanceCriteria: '- [ ] Drag task card between columns\n- [ ] Status updates on drop\n- [ ] Visual feedback during drag\n- [ ] Persists to kernel' },
    { id: 'task:ws-client', title: 'Connect dashboard to WebSocket', status: 'pending', priority: 'medium', feature: 'feature:realtime',
      description: 'Dashboard connects to WebSocket for live event updates without polling.',
      acceptanceCriteria: '- [ ] Auto-connect on page load\n- [ ] Reconnect on disconnect\n- [ ] Live event feed in Live tab\n- [ ] Status indicator in header' },
    { id: 'task:inbox-impl', title: 'Implement intent inbox + hook reader', status: 'pending', priority: 'medium', feature: 'feature:inbox',
      description: 'File-based inbox for dashboard-to-Cascade communication. Messages queued in inbox.json, read by ingest hook.',
      acceptanceCriteria: '- [ ] POST /api/inbox writes to inbox.json\n- [ ] Ingest hook reads pending messages\n- [ ] Messages marked as delivered after read\n- [ ] UI for composing messages' },
    { id: 'task:auto-export', title: 'Auto-export state on post_cascade_response', status: 'pending', priority: 'low', feature: 'feature:dashboard',
      description: 'Automatically run state export after each Cascade response to keep dashboard state fresh.' },
  ];

  for (const t of tasks) {
    const attrs: Record<string, unknown> = {
      title: t.title,
      status: t.status,
      priority: t.priority,
    };
    if (t.description) attrs.description = t.description;
    if (t.acceptanceCriteria) attrs.acceptanceCriteria = t.acceptanceCriteria;
    await kernel.createNode(t.id, attrs, 'Task');

    // Link task → feature
    if (t.feature) {
      await kernel.link(t.id, 'implements', t.feature);
    }
  }
  console.log(`  Tasks: ${tasks.length}`);

  // ── Decisions ──────────────────────────────────────────────────

  const decisions = [
    {
      id: 'decision:eav-store',
      title: 'Use TQL EAV store as project brain backend',
      rationale: 'Schema-agnostic triple store with EQL-S queries, already in the codebase. No external dependencies needed.',
      alternatives: 'SQLite tables, JSON files, external graph DB (Neo4j)',
      status: 'accepted',
    },
    {
      id: 'decision:static-dashboard',
      title: 'Ship dashboard as static HTML with state.json',
      rationale: 'Zero build step, works with any static file server. Tailwind CDN for styling.',
      alternatives: 'React/Svelte SPA, VS Code webview, Electron app',
      status: 'accepted',
    },
    {
      id: 'decision:ws-bridge',
      title: 'Use Bun WebSocket server for realtime updates',
      rationale: 'Bun has native WebSocket support, low overhead. Hooks push events via HTTP POST, server broadcasts to clients.',
      alternatives: 'Polling state.json, SSE, file watcher',
      status: 'proposed',
    },
    {
      id: 'decision:intent-inbox',
      title: 'Use file-based intent inbox for dashboard → Cascade',
      rationale: 'No Cascade API exists for programmatic messaging. Hooks read inbox on next fire and surface via show_output.',
      alternatives: 'Direct API (not available), clipboard injection, MCP server',
      status: 'proposed',
    },
  ];

  for (const d of decisions) {
    await kernel.createNode(d.id, {
      title: d.title,
      rationale: d.rationale,
      alternatives: d.alternatives,
      status: d.status,
    }, 'Decision');
  }
  console.log(`  Decisions: ${decisions.length}`);

  // ── Conventions ────────────────────────────────────────────────

  const conventions = [
    { id: 'conv:hook-prefix', name: 'Hook output prefix', rule: 'All hook console output starts with [HQ] or [HQ Guard]' },
    { id: 'conv:entity-ids', name: 'Entity ID format', rule: 'Entity IDs use type:slug format (e.g., task:scaffold, file:hooks/tql-init.ts)' },
    { id: 'conv:safe-query', name: 'Safe query pattern', rule: 'Always use safeQuery() wrapper that returns [] on error, never throw from EQL-S queries in generators' },
    { id: 'conv:no-node-modules', name: 'Frozen paths', rule: 'Guard blocks writes to node_modules/, .git/, lockfiles' },
  ];

  for (const c of conventions) {
    await kernel.createNode(c.id, {
      name: c.name,
      rule: c.rule,
    }, 'Convention');
  }
  console.log(`  Conventions: ${conventions.length}`);

  // ── Link milestones → features ─────────────────────────────────

  const milestoneFeatures: Record<string, string[]> = {
    'milestone:alpha': ['feature:ingest', 'feature:guard', 'feature:devlog', 'feature:autodocs', 'feature:standup', 'feature:git'],
    'milestone:beta': ['feature:dashboard', 'feature:realtime', 'feature:api', 'feature:kanban-crud', 'feature:inbox'],
    'milestone:v1': ['feature:nl-query', 'feature:ai-insights'],
  };

  for (const [mid, fids] of Object.entries(milestoneFeatures)) {
    for (const fid of fids) {
      await kernel.link(mid, 'includes', fid);
    }
  }

  // ── Checkpoint & summary ───────────────────────────────────────

  await kernel.checkpoint();

  const stats = kernel.getStore().getStats();
  console.log(`\n[HQ Seed] Done!`);
  console.log(`  Entities: ${stats.uniqueEntities} | Facts: ${stats.totalFacts} | Links: ${stats.totalLinks}`);

  kernel.close();
}

main().catch((err) => {
  console.error('[HQ Seed] Error:', err);
  process.exit(1);
});

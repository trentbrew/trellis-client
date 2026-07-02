#!/usr/bin/env bun

/**
 * HQ Server — unified local server for the project brain.
 *
 * Responsibilities:
 *   1. Serve the static dashboard at /
 *   2. REST API for kernel CRUD at /api/*
 *   3. WebSocket at /ws for live event streaming
 *   4. POST /api/events — hooks push events here for live broadcast
 *   5. POST /api/inbox — dashboard writes intents for Cascade to pick up
 *
 * Usage: bun run hooks/tql-server.ts [--port 3456]
 */

import { TrellisKernel } from '../packages/trellis-kernel/kernel/trellis-kernel.js';
import { createKernel, TQL_DIR, WORKSPACE_PATH } from './_kernel.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';

// ── Config ─────────────────────────────────────────────────────────────

const CLIENT_DIR = resolve(TQL_DIR, 'client-vue');
const INBOX_PATH = resolve(TQL_DIR, 'inbox.json');

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '3456');

// ── Kernel ─────────────────────────────────────────────────────────────

let kernel: TrellisKernel | null = null;

function getKernel(): TrellisKernel {
  if (!kernel) {
    kernel = createKernel();
  }
  return kernel;
}

function safeQuery(q: string): Record<string, unknown>[] {
  try {
    const k = getKernel();
    const result = k.query(q);
    // query is synchronous in practice
    return (result as any).rows || [];
  } catch {
    return [];
  }
}

// Clean EQL-S column names: strip ?x. prefix
function clean(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      cleaned[key.replace(/^\?[a-z]+\./, '')] = val;
    }
    return cleaned;
  });
}

// ── WebSocket Clients ──────────────────────────────────────────────────

const wsClients = new Set<any>();

function broadcast(event: { type: string; data: unknown }) {
  const msg = JSON.stringify(event);
  for (const ws of wsClients) {
    try { ws.send(msg); } catch { wsClients.delete(ws); }
  }
}

// ── State Export ───────────────────────────────────────────────────────

function exportState(): Record<string, unknown> {
  const k = getKernel();
  const stats = k.getStore().getStats();

  const typeFacts = k.getStore().getFactsByAttribute('type');
  const typeCounts: Record<string, number> = {};
  for (const fact of typeFacts) {
    typeCounts[String(fact.v)] = (typeCounts[String(fact.v)] || 0) + 1;
  }

  const files = clean(safeQuery('FIND File AS ?f RETURN ?f.path, ?f.language, ?f.readCount, ?f.writeCount, ?f.size ORDER BY ?f.writeCount DESC'));
  const changes = clean(safeQuery('FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved, ?c.timestamp'));
  const sessions = clean(safeQuery('FIND Session AS ?s RETURN ?s.trajectoryId, ?s.startTime, ?s.promptCount, ?s.intent'));
  const actions = clean(safeQuery('FIND Action AS ?a RETURN ?a.actionType, ?a.timestamp, ?a.executionId'));
  const tasks = clean(safeQuery('FIND Task AS ?t RETURN ?t.title, ?t.status, ?t.priority, ?t.description, ?t.acceptanceCriteria'));
  const features = clean(safeQuery('FIND Feature AS ?f RETURN ?f.title, ?f.status, ?f.priority, ?f.scope'));
  const milestones = clean(safeQuery('FIND Milestone AS ?m RETURN ?m.title, ?m.targetDate, ?m.status, ?m.completionPct'));
  const decisions = clean(safeQuery('FIND Decision AS ?d RETURN ?d.title, ?d.rationale, ?d.status, ?d.alternatives'));
  const dependencies = clean(safeQuery('FIND Dependency AS ?d RETURN ?d.name, ?d.version, ?d.depType'));
  const commits = clean(safeQuery('FIND Commit AS ?c RETURN ?c.hash, ?c.message, ?c.timestamp, ?c.filesChanged'));
  const conventions = clean(safeQuery('FIND Convention AS ?c RETURN ?c.name, ?c.rule'));

  // Distributions
  const langCounts: Record<string, number> = {};
  for (const f of files) { langCounts[String(f.language || 'unknown')] = (langCounts[String(f.language || 'unknown')] || 0) + 1; }
  const actionCounts: Record<string, number> = {};
  for (const a of actions) { actionCounts[String(a.actionType || 'unknown')] = (actionCounts[String(a.actionType || 'unknown')] || 0) + 1; }
  const taskStatusCounts: Record<string, number> = {};
  for (const t of tasks) { taskStatusCounts[String(t.status || 'unknown')] = (taskStatusCounts[String(t.status || 'unknown')] || 0) + 1; }

  return {
    exportedAt: new Date().toISOString(),
    stats, typeCounts,
    distributions: { languages: langCounts, actionTypes: actionCounts, taskStatuses: taskStatusCounts },
    entities: { files, changes, sessions, actions, tasks, features, milestones, decisions, dependencies, commits, conventions },
  };
}

// ── Inbox ──────────────────────────────────────────────────────────────

async function readInbox(): Promise<any[]> {
  if (!existsSync(INBOX_PATH)) return [];
  try {
    return JSON.parse(await readFile(INBOX_PATH, 'utf-8'));
  } catch { return []; }
}

async function writeInbox(items: any[]): Promise<void> {
  await writeFile(INBOX_PATH, JSON.stringify(items, null, 2));
}

// ── MIME Types ─────────────────────────────────────────────────────────

const mimeTypes: Record<string, string> = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// ── Server ─────────────────────────────────────────────────────────────

function tryServe(port: number, maxAttempts = 10): { server: ReturnType<typeof Bun.serve>; port: number } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tryPort = port + attempt;
    try {
      const s = Bun.serve({
        port: tryPort,
        fetch: serveFetch,
        websocket: wsHandlers,
      });
      return { server: s, port: tryPort };
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        console.log(`[HQ Server] Port ${tryPort} in use, trying ${tryPort + 1}...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[HQ Server] Could not find an available port in range ${port}–${port + maxAttempts - 1}`);
}

function serveFetch(req: Request, server: any) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return undefined as any;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── API Routes ───────────────────────────────────────────────

    if (url.pathname.startsWith('/api/')) {
      return handleApi(req, url).then(r => {
        // Add CORS to API responses
        for (const [k, v] of Object.entries(corsHeaders)) r.headers.set(k, v);
        return r;
      });
    }

    // ── Static Files ─────────────────────────────────────────────

    return serveStatic(url.pathname);
}

const wsHandlers = {
  open(ws: any) {
    wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', data: { clients: wsClients.size } }));
  },
  close(ws: any) {
    wsClients.delete(ws);
  },
  message(_ws: any, _msg: any) {
    // Client messages — could handle queries here in the future
  },
};

async function handleApi(req: Request, url: URL): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  // GET /api/state — full state export
  if (url.pathname === '/api/state' && req.method === 'GET') {
    return json(exportState());
  }

  // GET /api/query?q=... — run EQL-S query
  if (url.pathname === '/api/query' && req.method === 'GET') {
    const q = url.searchParams.get('q');
    if (!q) return json({ error: 'Missing ?q= parameter' }, 400);
    try {
      const rows = clean(safeQuery(q));
      return json({ query: q, rows, count: rows.length });
    } catch (err: any) {
      return json({ error: err.message }, 400);
    }
  }

  // POST /api/tasks — create a task
  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    const body = await req.json() as any;
    const id = `task:${body.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || Date.now()}`;
    const k = getKernel();
    const attrs: Record<string, unknown> = {
      title: body.title || 'Untitled',
      status: body.status || 'pending',
      priority: body.priority || 'medium',
    };
    if (body.description) attrs.description = body.description;
    if (body.acceptanceCriteria) attrs.acceptanceCriteria = body.acceptanceCriteria;
    await k.createNode(id, attrs, 'Task');
    if (body.feature) await k.link(id, 'implements', body.feature);
    await k.checkpoint();
    broadcast({ type: 'entity:created', data: { id, entityType: 'Task', ...body } });
    return json({ id, created: true });
  }

  // PUT /api/tasks/:id — update a task
  if (url.pathname.startsWith('/api/tasks/') && req.method === 'PUT') {
    const id = decodeURIComponent(url.pathname.slice('/api/tasks/'.length));
    const body = await req.json() as any;
    const k = getKernel();
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.acceptanceCriteria !== undefined) updates.acceptanceCriteria = body.acceptanceCriteria;
    if (Object.keys(updates).length > 0) {
      await k.createNode(id, updates, 'Task');
      await k.checkpoint();
      broadcast({ type: 'entity:updated', data: { id, ...updates } });
    }
    return json({ id, updated: true });
  }

  // POST /api/features — create a feature
  if (url.pathname === '/api/features' && req.method === 'POST') {
    const body = await req.json() as any;
    const id = `feature:${body.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || Date.now()}`;
    const k = getKernel();
    await k.createNode(id, {
      title: body.title || 'Untitled',
      status: body.status || 'backlog',
      priority: body.priority || 'medium',
      scope: body.scope || 'general',
    }, 'Feature');
    await k.checkpoint();
    broadcast({ type: 'entity:created', data: { id, entityType: 'Feature', ...body } });
    return json({ id, created: true });
  }

  // POST /api/events — hooks push live events here
  if (url.pathname === '/api/events' && req.method === 'POST') {
    const event = await req.json() as any;
    broadcast({ type: 'hook:event', data: event });
    return json({ broadcast: true, clients: wsClients.size });
  }

  // GET /api/inbox — read pending intents
  if (url.pathname === '/api/inbox' && req.method === 'GET') {
    const items = await readInbox();
    return json(items);
  }

  // POST /api/inbox — add an intent
  if (url.pathname === '/api/inbox' && req.method === 'POST') {
    const body = await req.json() as any;
    const items = await readInbox();
    const intent = {
      id: `intent:${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: body.type || 'message',
      content: body.content || '',
      status: 'pending',
    };
    items.push(intent);
    await writeInbox(items);
    broadcast({ type: 'inbox:added', data: intent });
    return json(intent);
  }

  // DELETE /api/inbox/:id — mark intent as processed
  if (url.pathname.startsWith('/api/inbox/') && req.method === 'DELETE') {
    const id = decodeURIComponent(url.pathname.slice('/api/inbox/'.length));
    const items = await readInbox();
    const filtered = items.filter((i: any) => i.id !== id);
    await writeInbox(filtered);
    return json({ deleted: true });
  }

  return json({ error: 'Not found' }, 404);
}

async function serveStatic(pathname: string): Promise<Response> {
  const DIST_DIR = resolve(CLIENT_DIR, 'dist');
  const normalizedPath = pathname === '/' ? 'index.html' : pathname.slice(1);

  // Try dist/ first (Vue/Vite build), then client root
  for (const base of [DIST_DIR, CLIENT_DIR]) {
    const filePath = resolve(base, normalizedPath);
    if (existsSync(filePath)) {
      const file = Bun.file(filePath);
      const ext = '.' + (filePath.split('.').pop() || '');
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      return new Response(file, { headers: { 'Content-Type': contentType } });
    }
  }

  // SPA fallback — serve index.html for non-file routes
  const indexPath = resolve(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), { headers: { 'Content-Type': 'text/html' } });
  }
  const rootIndex = resolve(CLIENT_DIR, 'index.html');
  if (existsSync(rootIndex)) {
    return new Response(Bun.file(rootIndex), { headers: { 'Content-Type': 'text/html' } });
  }

  return new Response('Not found', { status: 404 });
}

// ── Startup ────────────────────────────────────────────────────────────

const { server, port: actualPort } = tryServe(PORT);

console.log(`
╔══════════════════════════════════════════╗
║  HQ Server                               ║
║──────────────────────────────────────────║
║  Dashboard:  http://localhost:${actualPort}          ║
║  API:        http://localhost:${actualPort}/api      ║
║  WebSocket:  ws://localhost:${actualPort}/ws         ║
║  State:      GET  /api/state              ║
║  Query:      GET  /api/query?q=...        ║
║  Tasks:      POST /api/tasks              ║
║  Events:     POST /api/events             ║
║  Inbox:      GET|POST /api/inbox          ║
╚══════════════════════════════════════════╝
`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[HQ Server] Shutting down...');
  server.stop();
  kernel?.close();
  process.exit(0);
});

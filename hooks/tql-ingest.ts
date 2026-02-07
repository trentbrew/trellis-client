#!/usr/bin/env bun

/**
 * HQ Ingest Hook — feeds Cascade events into the TQL knowledge graph.
 *
 * Handles all 11 hook events and maps them to entity mutations
 * in the TrellisKernel backed by SQLite.
 */

import { TrellisKernel } from '../tql/kernel/trellis-kernel.js';
import { createKernel, PROJECT_ROOT, TQL_DIR } from './_kernel.js';
import { resolve, dirname, extname } from 'path';

// ── Types ──────────────────────────────────────────────────────────────

interface HookInput {
  agent_action_name: string;
  tool_info: Record<string, any>;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

// ── Paths ──────────────────────────────────────────────────────────────


// ── Kernel Boot ────────────────────────────────────────────────────────

function bootKernel(): TrellisKernel {
  return createKernel();
}

// ── Entity ID Helpers ──────────────────────────────────────────────────

function actionId(input: HookInput): string {
  return `action:${input.execution_id}:${input.agent_action_name}`;
}

function sessionId(input: HookInput): string {
  return `session:${input.trajectory_id}`;
}

function fileId(filePath: string): string {
  // Normalize to relative path from project root
  const rel = filePath.startsWith(PROJECT_ROOT)
    ? filePath.slice(PROJECT_ROOT.length + 1)
    : filePath;
  return `file:${rel}`;
}

function changeId(input: HookInput, filePath: string): string {
  return `change:${input.execution_id}:${filePath.replace(/\//g, '_')}`;
}

function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.rs': 'rust', '.go': 'go',
    '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.sh': 'shell', '.bash': 'shell',
    '.sql': 'sql', '.graphql': 'graphql',
    '.svelte': 'svelte', '.vue': 'vue',
  };
  return langMap[ext] || ext.slice(1) || 'unknown';
}

// ── Event Handlers ─────────────────────────────────────────────────────

async function ensureSession(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const sid = sessionId(input);
  const existing = kernel.getStore().getFactsByEntity(sid);

  if (existing.length === 0) {
    await kernel.createNode(sid, {
      trajectoryId: input.trajectory_id,
      startTime: input.timestamp,
      promptCount: 0,
      intent: '',
    }, 'Session');
  }
}

async function logAction(kernel: TrellisKernel, input: HookInput, extraData?: Record<string, any>): Promise<void> {
  const aid = actionId(input);
  await kernel.createNode(aid, {
    actionType: input.agent_action_name,
    executionId: input.execution_id,
    timestamp: input.timestamp,
    data: extraData ? JSON.stringify(extraData) : '',
  }, 'Action');

  // Link action to session
  await kernel.link(aid, 'belongs_to', sessionId(input));
}

async function handlePreReadCode(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const toolInfo = input.tool_info;
  const filePath = toolInfo.file_path || toolInfo.path || '';
  if (!filePath) return;

  const fid = fileId(filePath);
  const existing = kernel.getStore().getFactsByEntity(fid);

  if (existing.length === 0) {
    // First time seeing this file — create it
    await kernel.createNode(fid, {
      path: filePath.startsWith(PROJECT_ROOT) ? filePath.slice(PROJECT_ROOT.length + 1) : filePath,
      language: detectLanguage(filePath),
      readCount: 1,
      writeCount: 0,
      size: 0,
      lastModified: input.timestamp,
    }, 'File');
  } else {
    // Increment read count
    const readFact = existing.find(f => f.a === 'readCount');
    const currentCount = typeof readFact?.v === 'number' ? readFact.v : 0;
    await kernel.updateNode(fid, {
      ...Object.fromEntries(existing.filter(f => f.a !== 'type').map(f => [f.a, f.v])),
      readCount: currentCount + 1,
    }, 'File');
  }

  await logAction(kernel, input, { filePath });
}

async function handlePostWriteCode(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const toolInfo = input.tool_info;
  const filePath = toolInfo.file_path || toolInfo.path || '';
  if (!filePath) return;

  const edits = toolInfo.edits || [];
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const edit of edits) {
    const newLines = (edit.new_string || '').split('\n').length;
    const oldLines = (edit.old_string || '').split('\n').length;
    linesAdded += Math.max(0, newLines - oldLines);
    linesRemoved += Math.max(0, oldLines - newLines);
  }

  // Create Change entity
  const cid = changeId(input, filePath);
  const relPath = filePath.startsWith(PROJECT_ROOT) ? filePath.slice(PROJECT_ROOT.length + 1) : filePath;
  await kernel.createNode(cid, {
    filePath: relPath,
    linesAdded,
    linesRemoved,
    timestamp: input.timestamp,
    commitHash: '',
  }, 'Change');

  // Update or create File entity
  const fid = fileId(filePath);
  const existing = kernel.getStore().getFactsByEntity(fid);

  if (existing.length === 0) {
    await kernel.createNode(fid, {
      path: relPath,
      language: detectLanguage(filePath),
      readCount: 0,
      writeCount: 1,
      size: 0,
      lastModified: input.timestamp,
    }, 'File');
  } else {
    const writeFact = existing.find(f => f.a === 'writeCount');
    const currentCount = typeof writeFact?.v === 'number' ? writeFact.v : 0;
    await kernel.updateNode(fid, {
      ...Object.fromEntries(existing.filter(f => f.a !== 'type').map(f => [f.a, f.v])),
      writeCount: currentCount + 1,
      lastModified: input.timestamp,
    }, 'File');
  }

  // Link: Change --modifies--> File
  await kernel.link(cid, 'modifies', fid);

  // Link: Session --produces--> Change
  await kernel.link(sessionId(input), 'produces', cid);

  await logAction(kernel, input, { filePath: relPath, linesAdded, linesRemoved });
}

async function handlePostCascadeResponse(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const response = input.tool_info.response || '';
  const wordCount = response.split(/\s+/).filter(Boolean).length;

  await logAction(kernel, input, {
    wordCount,
    responseLength: response.length,
  });

  // Update session prompt count
  const sid = sessionId(input);
  const existing = kernel.getStore().getFactsByEntity(sid);
  const promptFact = existing.find(f => f.a === 'promptCount');
  const currentCount = typeof promptFact?.v === 'number' ? promptFact.v : 0;

  if (existing.length > 0) {
    await kernel.updateNode(sid, {
      ...Object.fromEntries(existing.filter(f => f.a !== 'type').map(f => [f.a, f.v])),
      promptCount: currentCount + 1,
    }, 'Session');
  }
}

async function handlePreRunCommand(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const command = input.tool_info.command || input.tool_info.command_line || '';
  await logAction(kernel, input, { command });
}

async function handlePostRunCommand(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const command = input.tool_info.command || input.tool_info.command_line || '';
  const exitCode = input.tool_info.exit_code;
  await logAction(kernel, input, { command, exitCode });
}

async function handlePreUserPrompt(kernel: TrellisKernel, input: HookInput): Promise<void> {
  await logAction(kernel, input, {
    prompt: (input.tool_info.prompt || '').slice(0, 500),
  });
}

async function handlePostUserPrompt(kernel: TrellisKernel, input: HookInput): Promise<void> {
  await logAction(kernel, input, {
    prompt: (input.tool_info.prompt || '').slice(0, 500),
  });
}

async function handleMcpToolUse(kernel: TrellisKernel, input: HookInput): Promise<void> {
  const toolName = input.tool_info.tool_name || input.tool_info.name || '';
  await logAction(kernel, input, { toolName });
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const raw = await Bun.stdin.text();

  let input: HookInput;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error('[HQ] Failed to parse hook input:', err);
    process.exit(1);
  }

  // Ensure .tql directory exists
  const { mkdirSync, existsSync } = await import('fs');
  if (!existsSync(TQL_DIR)) {
    console.error('[HQ] .tql directory not found. Run `bun run hooks/tql-init.ts` first.');
    process.exit(0); // Don't block — just skip
  }

  let kernel: TrellisKernel | null = null;

  try {
    kernel = bootKernel();

    // Ensure session entity exists
    await ensureSession(kernel, input);

    // Route to handler based on event type
    switch (input.agent_action_name) {
      case 'pre_read_code':
        await handlePreReadCode(kernel, input);
        break;
      case 'post_read_code':
        await handlePreReadCode(kernel, input); // Same logic — track file access
        break;
      case 'post_write_code':
        await handlePostWriteCode(kernel, input);
        break;
      case 'post_cascade_response':
        await handlePostCascadeResponse(kernel, input);
        break;
      case 'pre_run_command':
        await handlePreRunCommand(kernel, input);
        break;
      case 'post_run_command':
        await handlePostRunCommand(kernel, input);
        break;
      case 'pre_user_prompt':
        await handlePreUserPrompt(kernel, input);
        break;
      case 'post_user_prompt':
        await handlePostUserPrompt(kernel, input);
        break;
      case 'pre_mcp_tool_use':
      case 'post_mcp_tool_use':
        await handleMcpToolUse(kernel, input);
        break;
      default:
        // Unknown event — log it generically
        await logAction(kernel, input);
        break;
    }

    // Checkpoint periodically (every 50 ops)
    const totalFacts = kernel.getStore().getStats().totalFacts;
    if (totalFacts > 0 && totalFacts % 50 === 0) {
      await kernel.checkpoint();
    }

    // Push event to HQ Server for live broadcast (fire-and-forget)
    try {
      fetch('http://localhost:3456/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_action_name: input.agent_action_name,
          trajectory_id: input.trajectory_id,
          timestamp: input.timestamp || new Date().toISOString(),
        }),
      }).catch(() => {}); // Ignore if server isn't running
    } catch {}

    // Check inbox for messages from the dashboard
    const INBOX_PATH = resolve(TQL_DIR, 'inbox.json');
    try {
      const { existsSync } = await import('fs');
      const { readFile, writeFile } = await import('fs/promises');
      if (existsSync(INBOX_PATH)) {
        const items = JSON.parse(await readFile(INBOX_PATH, 'utf-8'));
        const pending = items.filter((i: any) => i.status === 'pending');
        if (pending.length > 0) {
          console.log(`[HQ Inbox] ${pending.length} message(s) from dashboard:`);
          for (const item of pending) {
            console.log(`  → ${item.content}`);
            item.status = 'delivered';
          }
          await writeFile(INBOX_PATH, JSON.stringify(items, null, 2));
        }
      }
    } catch {}

    console.log(`[HQ] ${input.agent_action_name} → ingested (session: ${input.trajectory_id.slice(0, 8)})`);
  } catch (err) {
    console.error(`[HQ] Error processing ${input.agent_action_name}:`, err);
  } finally {
    kernel?.close();
  }

  process.exit(0);
}

main();

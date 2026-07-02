#!/usr/bin/env bun

/**
 * HQ Git Integration — auto-commits .trellis/hq/ state and tracks git operations.
 *
 * Usage:
 *   bun run hooks/tql-git.ts              # Auto-commit .trellis/hq/ if dirty
 *   bun run hooks/tql-git.ts --sync       # Sync recent git commits into kernel
 */

import { createKernel, requireInit, PROJECT_ROOT, HQ_REL_PATH } from './_kernel.js';

async function run(cmd: string[], cwd: string): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
}

async function autoCommitHq(): Promise<void> {
  const { stdout: status } = await run(['git', 'status', '--porcelain', HQ_REL_PATH], PROJECT_ROOT);

  if (!status) {
    console.log(`[HQ Git] ${HQ_REL_PATH}/ is clean — nothing to commit.`);
    return;
  }

  const changedFiles = status.split('\n').filter(Boolean);
  console.log(`[HQ Git] ${changedFiles.length} changed file(s) in ${HQ_REL_PATH}/`);

  // Stage .tql/ files (exclude store.db, ops.jsonl snapshots, and state.json)
  const filesToStage = changedFiles
    .map(line => line.slice(3)) // strip status prefix
    .filter(f => !f.includes('store.db') && !f.includes('snapshot.json') && !f.includes('snapshots/') && !f.includes('state.json'));

  if (filesToStage.length === 0) {
    console.log('[HQ Git] Only binary/ephemeral files changed — skipping commit.');
    return;
  }

  for (const file of filesToStage) {
    await run(['git', 'add', file], PROJECT_ROOT);
  }

  // Build descriptive commit message
  const parts: string[] = [];
  const generated = filesToStage.filter(f => f.includes('generated/'));
  const devlog = filesToStage.filter(f => f.includes('devlog/'));
  const workflows = filesToStage.filter(f => f.includes('workflows/'));
  const other = filesToStage.filter(f => !f.includes('generated/') && !f.includes('devlog/') && !f.includes('workflows/'));

  if (generated.length > 0) parts.push(`${generated.length} doc(s)`);
  if (devlog.length > 0) parts.push(`${devlog.length} devlog(s)`);
  if (workflows.length > 0) parts.push(`${workflows.length} workflow(s)`);
  if (other.length > 0) parts.push(`${other.length} config(s)`);

  const message = `chore(hq): update ${parts.join(', ')}`;

  const { exitCode } = await run(['git', 'commit', '-m', message], PROJECT_ROOT);
  if (exitCode === 0) {
    console.log(`[HQ Git] Committed: "${message}"`);
  } else {
    console.log('[HQ Git] Nothing to commit after staging.');
  }
}

async function syncCommits(): Promise<void> {
  requireInit();
  const kernel = createKernel();

  try {
    // Get existing commit hashes
    const existingCommits = new Set<string>();
    const store = kernel.getStore();
    const typeFacts = store.getFactsByAttribute('type');
    for (const fact of typeFacts) {
      if (fact.v === 'Commit') {
        const hashFacts = store.getFactsByEntity(fact.e).filter(f => f.a === 'hash');
        for (const hf of hashFacts) {
          existingCommits.add(String(hf.v));
        }
      }
    }

    // Get recent git commits
    const { stdout } = await run(
      ['git', 'log', '--oneline', '-50', '--format=%H|%s|%aI|%an'],
      PROJECT_ROOT
    );

    const lines = stdout.split('\n').filter(Boolean);
    let added = 0;

    for (const line of lines) {
      const [hash, message, timestamp, _author] = line.split('|');
      if (!hash) continue;

      const shortHash = hash.slice(0, 8);
      if (existingCommits.has(shortHash)) continue;

      // Get file count for this commit
      const { stdout: diffStat } = await run(
        ['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', hash],
        PROJECT_ROOT
      );
      const filesChanged = diffStat.split('\n').filter(Boolean).length;

      const cid = `commit:${shortHash}`;
      await kernel.createNode(cid, {
        hash: shortHash,
        message: message || '',
        timestamp: timestamp || new Date().toISOString(),
        filesChanged,
      }, 'Commit');

      added++;
    }

    if (added > 0) {
      await kernel.checkpoint();
      console.log(`[HQ Git] Synced ${added} new commit(s) into kernel.`);
    } else {
      console.log('[HQ Git] All commits already synced.');
    }
  } finally {
    kernel.close();
  }
}

async function main() {
  const flag = process.argv[2] || '';

  if (flag === '--sync') {
    await syncCommits();
  } else {
    await autoCommitHq();
  }
}

main().catch((err) => {
  console.error('[HQ Git] Error:', err);
  process.exit(1);
});

#!/usr/bin/env bun

/**
 * HQ Compact — compacts the JSONL op log by snapshotting current state.
 *
 * Replays the full op log into a fresh EAVStore, writes a snapshot,
 * then truncates ops.jsonl. Both snapshot.json and ops.jsonl get committed to git.
 *
 * Usage: bun run hooks/tql-compact.ts
 */

import { createKernel, requireInit, OPS_PATH, HQ_REL_PATH } from './_kernel.js';
import { readFileSync, writeFileSync, statSync } from 'fs';

async function main() {
  requireInit();

  const statBefore = statSync(OPS_PATH);
  const linesBefore = readFileSync(OPS_PATH, 'utf-8').trim().split('\n').filter(Boolean).length;

  console.log(`[HQ Compact] Op log: ${linesBefore} ops (${(statBefore.size / 1024).toFixed(1)} KB)`);

  // 1. Replay full log into kernel
  const kernel = createKernel();
  const store = kernel.getStore();
  const stats = store.getStats();

  console.log(`[HQ Compact] Replayed: ${stats.uniqueEntities} entities, ${stats.totalFacts} facts, ${stats.totalLinks} links`);

  // 2. Write snapshot
  await kernel.checkpoint();
  console.log(`[HQ Compact] Snapshot written to ${HQ_REL_PATH}/snapshot.json`);

  // 3. Truncate ops.jsonl (snapshot is the new baseline)
  writeFileSync(OPS_PATH, '', 'utf-8');
  console.log(`[HQ Compact] Op log truncated (0 ops)`);

  console.log(`\n[HQ Compact] Done. Next boot will load from snapshot.`);
  console.log(`  Commit both ${HQ_REL_PATH}/snapshot.json and ${HQ_REL_PATH}/ops.jsonl to git.`);

  kernel.close();
}

main().catch((err) => {
  console.error('[HQ Compact] Error:', err);
  process.exit(1);
});

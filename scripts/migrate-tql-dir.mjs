#!/usr/bin/env node
/**
 * One-time migration: copy HQ data from .tql/ → .trellis/hq/
 *
 * Usage:
 *   node scripts/migrate-tql-dir.mjs
 *   node scripts/migrate-tql-dir.mjs --dry-run
 *   node scripts/migrate-tql-dir.mjs --force
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(PROJECT_ROOT, '.tql');
const DEST = join(PROJECT_ROOT, '.trellis', 'hq');

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

let copied = 0;
let skipped = 0;
let conflicts = 0;

function copyEntry(srcPath, destPath, name) {
  const rel = relative(PROJECT_ROOT, destPath);

  if (existsSync(destPath) && !force) {
    skipped++;
    console.log(`  skip  ${rel}`);
    return;
  }

  if (existsSync(destPath) && force) {
    conflicts++;
    console.log(`  force ${rel}`);
  } else {
    copied++;
    console.log(`  copy  ${rel}`);
  }

  if (!dryRun) {
    mkdirSync(join(destPath, '..'), { recursive: true });
    cpSync(srcPath, destPath, { recursive: true, force });
  }
}

function walk(srcDir, destDir) {
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    const destPath = join(destDir, name);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!dryRun) mkdirSync(destPath, { recursive: true });
      walk(srcPath, destPath);
    } else {
      copyEntry(srcPath, destPath, name);
    }
  }
}

function main() {
  if (!existsSync(SOURCE)) {
    console.log('[migrate-tql-dir] No .tql/ directory — nothing to migrate.');
    process.exit(0);
  }

  console.log(`[migrate-tql-dir] ${dryRun ? 'DRY RUN — ' : ''}.tql/ → .trellis/hq/`);

  if (!dryRun) {
    mkdirSync(DEST, { recursive: true });
  }

  walk(SOURCE, DEST);

  console.log(`\n[migrate-tql-dir] copied: ${copied}, skipped: ${skipped}, forced: ${conflicts}`);
  process.exit(0);
}

main();

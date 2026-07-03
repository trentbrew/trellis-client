#!/usr/bin/env node
/**
 * CI guard: fail on @turtle.tech/tql imports outside packages/tql shim.
 *
 * Usage:
 *   node scripts/check-kernel-imports.mjs
 *   node scripts/check-kernel-imports.mjs --verbose
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

const IMPORT_PATTERNS = [
  /from\s+['"]@turtle\.tech\/tql['"]/,
  /import\s+['"]@turtle\.tech\/tql['"]/,
  /import\s+.*\s+from\s+['"]@turtle\.tech\/tql['"]/,
  /require\s*\(\s*['"]@turtle\.tech\/tql['"]\s*\)/,
];

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.nuxt',
  '.output',
  '.git',
  'coverage',
  '.turbo',
  '.cache',
]);

const SKIP_DIR_PREFIXES = ['docs', '.agent', 'living-docs'];

const CODE_EXTENSIONS = new Set(['.ts', '.mts', '.mjs', '.vue']);

function shouldSkipDir(relPath) {
  if (!relPath) return false;
  if (relPath === 'packages/tql' || relPath.startsWith('packages/tql/')) return true;
  return SKIP_DIR_PREFIXES.some((p) => relPath === p || relPath.startsWith(`${p}/`));
}

function walk(dir, relBase, violations) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relBase ? `${relBase}/${name}` : name;

    if (shouldSkipDir(rel)) continue;

    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      walk(abs, rel, violations);
      continue;
    }

    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    if (name === 'package.json') {
      scanPackageJson(abs, rel, violations);
    } else if (CODE_EXTENSIONS.has(ext)) {
      scanCodeFile(abs, rel, violations);
    }
  }
}

function scanCodeFile(absPath, relPath, violations) {
  const lines = readFileSync(absPath, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (IMPORT_PATTERNS.some((re) => re.test(line))) {
      violations.push({ file: relPath, line: i + 1, text: line.trim() });
    }
  }
}

function scanPackageJson(absPath, relPath, violations) {
  if (relPath === 'packages/tql/package.json') return;

  const lines = readFileSync(absPath, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/["']@turtle\.tech\/tql["']\s*:/.test(line)) {
      violations.push({ file: relPath, line: i + 1, text: line.trim() });
    }
  }
}

const violations = [];
walk(PROJECT_ROOT, '', violations);

if (violations.length === 0) {
  console.log('[check-kernel-imports] OK — no disallowed @turtle.tech/tql imports');
  process.exit(0);
}

for (const v of violations) {
  console.error(`${v.file}:${v.line}: ${v.text}`);
}

if (verbose) {
  console.error(`\n[check-kernel-imports] ${violations.length} violation(s) listed above.`);
}

console.error(
  `\n[check-kernel-imports] FAILED — ${violations.length} violation(s). Use @turtle.tech/trellis-kernel instead.`,
);
process.exit(1);

#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(dir, '..');
const root = resolve(pkg, '../..');
const app = join(root, 'apps/web');
const dist = join(app, '.output');
const out = join(pkg, 'web');

console.log('Building Trellis web app...');

const result = spawnSync('pnpm', ['--filter', './apps/web', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NITRO_PRESET: 'node-server',
    TRELLIS_DISABLE_BACKGROUND_JOBS: '1',
  },
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

if (!existsSync(join(dist, 'server/index.mjs'))) {
  console.error(
    'Error: apps/web/.output/server/index.mjs not found after build',
  );
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
renameSync(dist, out);
rmSync(join(out, 'server', 'node_modules', 'better-sqlite3'), {
  recursive: true,
  force: true,
});

console.log('Web runtime moved to packages/trellis-cli/web/');

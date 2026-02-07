#!/usr/bin/env bun

/**
 * HQ Init — bootstraps the .tql/ directory for any project.
 *
 * Scans the existing project structure and seeds the TQL knowledge graph
 * with File entities, Dependency entities, and initial metadata.
 */

import { TrellisKernel } from '../tql/kernel/trellis-kernel.js';
import { createKernel, PROJECT_ROOT, TQL_DIR, WORKSPACE_PATH } from './_kernel.js';
import { resolve, extname, relative } from 'path';
import { readdir, stat, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// ── Helpers ────────────────────────────────────────────────────────────

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

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.tql', '.windsurf', 'dist', 'build',
  '.next', '.nuxt', '.svelte-kit', 'coverage', '__pycache__',
  'cascade-archive', 'logs', '.cache', '.turbo',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.md',
  '.json', '.yaml', '.yml', '.html', '.css', '.scss',
  '.sh', '.bash', '.sql', '.graphql', '.svelte', '.vue',
  '.toml', '.cfg', '.ini', '.env',
]);

async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        await walkDir(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext) || entry.name === 'package.json' || entry.name === 'Cargo.toml') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// ── Seeders ────────────────────────────────────────────────────────────

async function seedFiles(kernel: TrellisKernel, files: string[]): Promise<number> {
  let count = 0;

  for (const filePath of files) {
    const relPath = relative(PROJECT_ROOT, filePath);
    const fid = `file:${relPath}`;
    const fileStat = await stat(filePath);

    await kernel.createNode(fid, {
      path: relPath,
      language: detectLanguage(filePath),
      size: fileStat.size,
      lastModified: fileStat.mtime.toISOString(),
      readCount: 0,
      writeCount: 0,
    }, 'File');

    count++;
  }

  return count;
}

async function seedDependencies(kernel: TrellisKernel): Promise<number> {
  let count = 0;

  // Try package.json (Node/Bun)
  const pkgPath = resolve(PROJECT_ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      const depSections: Array<{ deps: Record<string, string>; depType: string }> = [
        { deps: pkg.dependencies || {}, depType: 'production' },
        { deps: pkg.devDependencies || {}, depType: 'development' },
        { deps: pkg.peerDependencies || {}, depType: 'peer' },
        { deps: pkg.optionalDependencies || {}, depType: 'optional' },
      ];

      for (const { deps, depType } of depSections) {
        for (const [name, version] of Object.entries(deps)) {
          const did = `dep:${name}`;
          await kernel.createNode(did, {
            name,
            version: version as string,
            depType,
          }, 'Dependency');
          count++;
        }
      }
    } catch (err) {
      console.warn('[HQ] Warning: Failed to parse package.json:', err);
    }
  }

  // Try Cargo.toml (Rust)
  const cargoPath = resolve(PROJECT_ROOT, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    try {
      const content = await readFile(cargoPath, 'utf-8');
      const depRegex = /^\[dependencies\]\s*\n([\s\S]*?)(?=\n\[|$)/m;
      const match = content.match(depRegex);
      if (match && match[1]) {
        const lines = match[1].split('\n').filter(l => l.includes('='));
        for (const line of lines) {
          const [name, ...rest] = line.split('=');
          if (name) {
            const version = rest.join('=').replace(/["\s]/g, '');
            const did = `dep:${name.trim()}`;
            await kernel.createNode(did, {
              name: name.trim(),
              version,
              depType: 'production',
            }, 'Dependency');
            count++;
          }
        }
      }
    } catch (err) {
      console.warn('[HQ] Warning: Failed to parse Cargo.toml:', err);
    }
  }

  return count;
}

async function seedFromGitLog(kernel: TrellisKernel): Promise<number> {
  let count = 0;

  try {
    const proc = Bun.spawn(['git', 'log', '--oneline', '-20', '--format=%H|%s|%aI|%an'], {
      cwd: PROJECT_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const [hash, message, timestamp, _author] = line.split('|');
      if (!hash) continue;

      const cid = `commit:${hash.slice(0, 8)}`;
      await kernel.createNode(cid, {
        hash: hash.slice(0, 8),
        message: message || '',
        timestamp: timestamp || new Date().toISOString(),
        filesChanged: 0,
      }, 'Commit');
      count++;
    }
  } catch (err) {
    // Git might not be available or repo might not exist
    console.warn('[HQ] Warning: Could not read git log:', err);
  }

  return count;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('[HQ] Initializing .tql/ project brain...\n');

  // 1. Create directory structure
  const dirs = [
    TQL_DIR,
    resolve(TQL_DIR, 'workflows'),
    resolve(TQL_DIR, 'devlog'),
    resolve(TQL_DIR, 'generated'),
    resolve(TQL_DIR, 'snapshots'),
    resolve(TQL_DIR, 'client'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      console.log(`  Created: ${relative(PROJECT_ROOT, dir)}/`);
    }
  }

  // 2. Check for workspace.json
  if (!existsSync(WORKSPACE_PATH)) {
    console.error('[HQ] Error: .tql/workspace.json not found. Please create it first.');
    process.exit(1);
  }

  // 3. Boot kernel with JSONL backend
  const kernel = createKernel();

  // 4. Load workspace config and boot
  const workspaceConfig = JSON.parse(await readFile(WORKSPACE_PATH, 'utf-8'));
  await kernel.boot(workspaceConfig);
  console.log(`  Loaded workspace: ${workspaceConfig.workspace.name || 'unnamed'}`);

  // 5. Scan project files
  console.log('\n[HQ] Scanning project...');
  const files = await walkDir(PROJECT_ROOT);
  const fileCount = await seedFiles(kernel, files);
  console.log(`  Files: ${fileCount} source files indexed`);

  // 6. Seed dependencies
  const depCount = await seedDependencies(kernel);
  console.log(`  Dependencies: ${depCount} packages found`);

  // 7. Seed from git log
  const commitCount = await seedFromGitLog(kernel);
  if (commitCount > 0) {
    console.log(`  Commits: ${commitCount} recent commits imported`);
  }

  // 8. Checkpoint
  await kernel.checkpoint();

  // 9. Print stats
  const stats = kernel.getStore().getStats();
  console.log('\n[HQ] Initialization complete!');
  console.log(`  Total facts: ${stats.totalFacts}`);
  console.log(`  Total links: ${stats.totalLinks}`);
  console.log(`  Unique entities: ${stats.uniqueEntities}`);
  console.log(`  Unique attributes: ${stats.uniqueAttributes}`);
  console.log(`\n  Op log: .tql/ops.jsonl`);
  console.log(`  Schema: .tql/workspace.json`);

  kernel.close();
}

main().catch((err) => {
  console.error('[HQ] Fatal error during initialization:', err);
  process.exit(1);
});

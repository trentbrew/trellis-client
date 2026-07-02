#!/usr/bin/env bun

/**
 * TQL Living Docs Sync — diff-aware documentation generator.
 *
 * Reads .tql/docs.trellis.jsonld (the documentation ontology),
 * determines which DocModules are affected by recent changes,
 * regenerates their auto sections from the TQL kernel, preserves
 * manual sections, writes to living-docs/, and amends the commit.
 *
 * Trigger: .husky/post-commit OR manual via `bun run hooks/tql-docs-sync.ts`
 * Flags:
 *   --all        Regenerate all modules regardless of diff
 *   --no-amend   Skip the git amend step (useful for manual runs)
 */

import { TrellisKernel } from '../packages/trellis-kernel/kernel/trellis-kernel.js';
import { createKernel, TRELLIS_HQ_DIR, PROJECT_ROOT, HQ_REL_PATH, OPS_PATH } from './_kernel.js';
import { resolve, relative } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

// ── Types ──────────────────────────────────────────────────────────────

interface DocSection {
  heading: string;
  mode: 'auto' | 'manual' | 'hybrid';
  template?: string;
  sourceHint?: string;
}

interface DocModule {
  '@id': string;
  '@type': string;
  title: string;
  description: string;
  sourceGlobs: string[];
  outputPath: string;
  status: string;
  sections: DocSection[];
}

interface TrellisDoc {
  '@context': Record<string, string>;
  '@graph': DocModule[];
}

// ── Constants ──────────────────────────────────────────────────────────

const TRELLIS_PATH = resolve(TRELLIS_HQ_DIR, 'docs.trellis.jsonld');
const LIVING_DOCS_DIR = resolve(PROJECT_ROOT, 'living-docs');
const MANUAL_MARKER_START = '<!-- manual:start -->';
const MANUAL_MARKER_END = '<!-- manual:end -->';

// ── Glob Matching ──────────────────────────────────────────────────────

export function matchesGlobs(filePath: string, globs: string[]): boolean {
  for (const pattern of globs) {
    const glob = new Bun.Glob(pattern);
    if (glob.match(filePath)) return true;
  }
  return false;
}

// ── Git Helpers ────────────────────────────────────────────────────────

function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    // If there's only one commit or git fails, return empty
    return [];
  }
}

function amendCommit(): void {
  try {
    execSync(`git add "${LIVING_DOCS_DIR}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 10000,
    });
    // Check if there are staged changes to amend
    const status = execSync('git diff --cached --name-only', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    if (status.length > 0) {
      execSync('git commit --amend --no-edit --no-verify', {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 10000,
        env: { ...process.env, TQL_DOCS_SYNC_RUNNING: '1' },
      });
      console.log('[Living Docs] Amended commit with updated docs.');
    }
  } catch (err) {
    console.error('[Living Docs] Failed to amend commit:', err);
  }
}

// ── Trellis Loader ─────────────────────────────────────────────────────

export function loadTrellis(): DocModule[] {
  if (!existsSync(TRELLIS_PATH)) {
    console.error(`[Living Docs] No ${HQ_REL_PATH}/docs.trellis.jsonld found.`);
    return [];
  }
  const raw = readFileSync(TRELLIS_PATH, 'utf-8');
  const doc: TrellisDoc = JSON.parse(raw);
  return doc['@graph'].filter((m) => m.status === 'active');
}

// ── Manual Section Preservation ────────────────────────────────────────

export function extractManualSections(existingContent: string): Map<string, string> {
  const manual = new Map<string, string>();
  const lines = existingContent.split('\n');
  let currentHeading = '';
  let inManual = false;
  let manualContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentHeading = line.replace(/^## /, '').trim();
    }
    if (line.includes(MANUAL_MARKER_START)) {
      inManual = true;
      manualContent = [];
      continue;
    }
    if (line.includes(MANUAL_MARKER_END)) {
      inManual = false;
      manual.set(currentHeading, manualContent.join('\n'));
      continue;
    }
    if (inManual) {
      manualContent.push(line);
    }
  }
  return manual;
}

// ── Kernel Query Helpers ───────────────────────────────────────────────

function safeQuery(kernel: TrellisKernel, q: string): Record<string, unknown>[] {
  try {
    const result = kernel.query(q);
    if (result instanceof Promise) return []; // sync-only in this context
    return (result as { rows: Record<string, unknown>[] }).rows ?? [];
  } catch {
    return [];
  }
}

// ── Template Renderers ─────────────────────────────────────────────────

function renderCommitsTable(kernel: TrellisKernel): string {
  const commits = safeQuery(kernel,
    'FIND Commit AS ?c RETURN ?c.hash, ?c.message, ?c.timestamp'
  );
  if (commits.length === 0) return '*No commits tracked yet.*\n';

  let md = '';
  for (const c of commits) {
    const hash = String(c['?c.hash'] || '').slice(0, 7);
    md += `- **\`${hash}\`** — ${c['?c.message'] || 'No message'} (${c['?c.timestamp'] || ''})\n`;
  }
  return md;
}

function renderChangesTable(kernel: TrellisKernel): string {
  const changes = safeQuery(kernel,
    'FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved, ?c.timestamp'
  );
  if (changes.length === 0) return '*No code changes tracked yet.*\n';

  let md = '| File | +Added | -Removed | Timestamp |\n';
  md += '|------|--------|----------|-----------|\n';
  for (const c of changes) {
    md += `| \`${c['?c.filePath']}\` | +${c['?c.linesAdded'] || 0} | -${c['?c.linesRemoved'] || 0} | ${c['?c.timestamp'] || ''} |\n`;
  }
  return md;
}

function renderAdrList(kernel: TrellisKernel): string {
  const decisions = safeQuery(kernel,
    'FIND Decision AS ?d RETURN ?d.title, ?d.rationale, ?d.alternatives, ?d.status'
  );
  if (decisions.length === 0) return '*No decisions recorded yet. Decisions are auto-extracted from Cascade sessions.*\n';

  let md = '';
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!;
    md += `### ADR-${String(i + 1).padStart(3, '0')}: ${d['?d.title'] || 'Untitled'}\n\n`;
    md += `- **Status**: ${d['?d.status'] || 'proposed'}\n`;
    md += `- **Rationale**: ${d['?d.rationale'] || 'Not recorded'}\n`;
    md += `- **Alternatives**: ${d['?d.alternatives'] || 'None recorded'}\n\n`;
  }
  return md;
}

function renderMilestonesProgress(kernel: TrellisKernel): string {
  const milestones = safeQuery(kernel,
    'FIND Milestone AS ?m RETURN ?m.title, ?m.targetDate, ?m.status, ?m.completionPct'
  );
  if (milestones.length === 0) return '*No milestones defined yet.*\n';

  let md = '';
  for (const m of milestones) {
    const pct = Number(m['?m.completionPct'] || 0);
    const filled = Math.round(pct * 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    md += `### ${m['?m.title'] || 'Untitled'} [${bar}] ${Math.round(pct * 100)}%`;
    if (m['?m.targetDate']) md += ` — Target: ${m['?m.targetDate']}`;
    md += '\n\n';
  }
  return md;
}

function renderFeaturesChecklist(kernel: TrellisKernel): string {
  const features = safeQuery(kernel,
    'FIND Feature AS ?f RETURN ?f.title, ?f.status, ?f.priority, ?f.scope'
  );
  if (features.length === 0) return '*No features tracked yet.*\n';

  let md = '';
  for (const f of features) {
    const status = String(f['?f.status'] || 'backlog');
    const check = status === 'done' ? 'x' : ' ';
    md += `- [${check}] **${f['?f.title'] || 'Untitled'}** (${status}) — scope: ${f['?f.scope'] || 'unscoped'}\n`;
  }
  return md;
}

function renderFeaturesByScope(kernel: TrellisKernel): string {
  const features = safeQuery(kernel,
    'FIND Feature AS ?f RETURN ?f.title, ?f.description, ?f.status, ?f.priority, ?f.scope'
  );
  if (features.length === 0) return '*No features tracked yet.*\n';

  const byScope: Record<string, typeof features> = {};
  for (const f of features) {
    const scope = String(f['?f.scope'] || 'general');
    if (!byScope[scope]) byScope[scope] = [];
    byScope[scope]!.push(f);
  }

  let md = '';
  for (const [scope, scopeFeatures] of Object.entries(byScope)) {
    md += `### ${scope.charAt(0).toUpperCase() + scope.slice(1)}\n\n`;
    for (const f of scopeFeatures) {
      md += `- **${f['?f.title'] || 'Untitled'}** (${f['?f.status'] || 'backlog'}, priority: ${f['?f.priority'] || 'unset'})\n`;
      if (f['?f.description']) md += `  ${f['?f.description']}\n`;
    }
    md += '\n';
  }
  return md;
}

function renderDepsTable(kernel: TrellisKernel): string {
  const deps = safeQuery(kernel,
    'FIND Dependency AS ?d RETURN ?d.name, ?d.version, ?d.depType'
  );
  if (deps.length === 0) return '*No dependencies tracked yet.*\n';

  let md = '| Package | Version | Type |\n';
  md += '|---------|---------|------|\n';
  for (const d of deps) {
    md += `| ${d['?d.name']} | ${d['?d.version'] || '-'} | ${d['?d.depType'] || '-'} |\n`;
  }
  return md;
}

function renderConventionsList(kernel: TrellisKernel): string {
  const conventions = safeQuery(kernel,
    'FIND Convention AS ?c RETURN ?c.name, ?c.rule, ?c.examples'
  );
  if (conventions.length === 0) return '*No conventions defined yet.*\n';

  let md = '';
  for (const c of conventions) {
    md += `### ${c['?c.name'] || 'Unnamed'}\n\n`;
    md += `**Rule**: ${c['?c.rule'] || 'No rule defined'}\n\n`;
    if (c['?c.examples']) {
      md += `**Examples**:\n${c['?c.examples']}\n\n`;
    }
  }
  return md;
}

function renderHooksRegistry(_kernel: TrellisKernel): string {
  const hooksPath = resolve(PROJECT_ROOT, '.windsurf/hooks.json');
  if (!existsSync(hooksPath)) return '*No hooks.json found.*\n';

  try {
    const raw = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    const hooks = raw.hooks || {};
    let md = '';
    for (const [event, entries] of Object.entries(hooks)) {
      const commands = entries as Array<{ command: string }>;
      if (commands.length === 0) continue;
      md += `### \`${event}\`\n\n`;
      for (const entry of commands) {
        md += `- \`${entry.command}\`\n`;
      }
      md += '\n';
    }
    return md || '*No hooks registered.*\n';
  } catch {
    return '*Failed to parse hooks.json.*\n';
  }
}

function renderFileSummary(_kernel: TrellisKernel, sourceHint?: string): string {
  if (!sourceHint) return '*No source hint provided.*\n';

  const fullPath = resolve(PROJECT_ROOT, sourceHint);
  if (!existsSync(fullPath)) return `*File not found: \`${sourceHint}\`*\n`;

  const stat = statSync(fullPath);
  if (stat.isDirectory()) {
    const files = readdirSync(fullPath).filter((f) => !f.startsWith('.'));
    let md = `| File | Size |\n|------|------|\n`;
    for (const f of files) {
      const fPath = resolve(fullPath, f);
      const fStat = statSync(fPath);
      md += `| \`${f}\` | ${fStat.isDirectory() ? 'dir' : `${fStat.size} bytes`} |\n`;
    }
    return md;
  }

  const content = readFileSync(fullPath, 'utf-8');
  const lineCount = content.split('\n').length;
  const exportMatches = content.match(/^export\s+(function|const|class|interface|type|enum|async\s+function)\s+(\w+)/gm) || [];

  let md = `**File**: \`${sourceHint}\` — ${lineCount} lines\n\n`;
  if (exportMatches.length > 0) {
    md += `**Exports**:\n`;
    for (const exp of exportMatches) {
      md += `- \`${exp.replace(/^export\s+/, '')}\`\n`;
    }
    md += '\n';
  }
  return md;
}

function renderTestList(_kernel: TrellisKernel, sourceHint?: string): string {
  if (!sourceHint) return '*No test directory specified.*\n';

  const fullPath = resolve(PROJECT_ROOT, sourceHint);
  if (!existsSync(fullPath)) return `*Test directory not found: \`${sourceHint}\`*\n`;

  const stat = statSync(fullPath);
  const testFiles = stat.isDirectory()
    ? readdirSync(fullPath).filter((f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'))
    : [sourceHint];

  if (testFiles.length === 0) return '*No test files found.*\n';

  let md = '| Test File | Size |\n|-----------|------|\n';
  for (const f of testFiles) {
    const fPath = stat.isDirectory() ? resolve(fullPath, f) : resolve(PROJECT_ROOT, f);
    if (existsSync(fPath)) {
      const fStat = statSync(fPath);
      md += `| \`${f}\` | ${fStat.size} bytes |\n`;
    }
  }
  return md;
}

function renderRecentChanges(kernel: TrellisKernel, module: DocModule): string {
  const changes = safeQuery(kernel,
    'FIND Change AS ?c RETURN ?c.filePath, ?c.linesAdded, ?c.linesRemoved, ?c.timestamp'
  );
  if (changes.length === 0) return '*No recent changes tracked.*\n';

  // Filter to changes matching this module's globs
  const relevant = changes.filter((c) => {
    const fp = String(c['?c.filePath'] || '');
    return matchesGlobs(fp, module.sourceGlobs);
  });

  if (relevant.length === 0) return '*No recent changes to this module.*\n';

  let md = '| File | +Added | -Removed | Timestamp |\n';
  md += '|------|--------|----------|-----------|\n';
  for (const c of relevant.slice(0, 20)) {
    md += `| \`${c['?c.filePath']}\` | +${c['?c.linesAdded'] || 0} | -${c['?c.linesRemoved'] || 0} | ${c['?c.timestamp'] || ''} |\n`;
  }
  return md;
}

// ── Template Dispatch ──────────────────────────────────────────────────

function renderTemplate(
  template: string,
  kernel: TrellisKernel,
  section: DocSection,
  module: DocModule,
): string {
  switch (template) {
    case 'commits-table': return renderCommitsTable(kernel);
    case 'changes-table': return renderChangesTable(kernel);
    case 'adr-list': return renderAdrList(kernel);
    case 'milestones-progress': return renderMilestonesProgress(kernel);
    case 'features-checklist': return renderFeaturesChecklist(kernel);
    case 'features-by-scope': return renderFeaturesByScope(kernel);
    case 'deps-table': return renderDepsTable(kernel);
    case 'conventions-list': return renderConventionsList(kernel);
    case 'hooks-registry': return renderHooksRegistry(kernel);
    case 'file-summary': return renderFileSummary(kernel, section.sourceHint);
    case 'test-list': return renderTestList(kernel, section.sourceHint);
    case 'recent-changes': return renderRecentChanges(kernel, module);
    default: return `*Unknown template: \`${template}\`*\n`;
  }
}

// ── Document Builder ───────────────────────────────────────────────────

export function buildDocument(module: DocModule, kernel: TrellisKernel, existingContent: string): string {
  const manualSections = extractManualSections(existingContent);
  const now = new Date().toISOString();

  let md = `# ${module.title}\n\n`;
  md += `> ${module.description}\n\n`;

  for (const section of module.sections) {
    md += `## ${section.heading}\n\n`;

    switch (section.mode) {
      case 'manual': {
        const existing = manualSections.get(section.heading);
        md += `${MANUAL_MARKER_START}\n`;
        md += existing || '*Write your content here. This section is preserved across regenerations.*';
        md += `\n${MANUAL_MARKER_END}\n\n`;
        break;
      }
      case 'hybrid': {
        // Auto-generated part
        if (section.template) {
          md += renderTemplate(section.template, kernel, section, module);
        }
        md += '\n';
        // Manual part
        const existing = manualSections.get(section.heading);
        md += `${MANUAL_MARKER_START}\n`;
        md += existing || '*Add additional notes here.*';
        md += `\n${MANUAL_MARKER_END}\n\n`;
        break;
      }
      case 'auto':
      default: {
        if (section.template) {
          md += renderTemplate(section.template, kernel, section, module);
        } else {
          md += '*No template defined for this section.*\n';
        }
        md += '\n';
        break;
      }
    }
  }

  md += `---\n*Auto-generated by [TQL Living Docs](../${HQ_REL_PATH}/docs.trellis.jsonld) at ${now}*\n`;
  return md;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  // Guard against recursive invocation: post-commit hook re-fires on --amend
  if (process.env.TQL_DOCS_SYNC_RUNNING) return;

  const args = process.argv.slice(2);
  const regenerateAll = args.includes('--all');
  const noAmend = args.includes('--no-amend');

  // Load the trellis
  const modules = loadTrellis();
  if (modules.length === 0) {
    console.log('[Living Docs] No active modules in trellis. Nothing to do.');
    process.exit(0);
  }

  // Get changed files
  const changedFiles = regenerateAll ? [] : getChangedFiles();

  // Determine which modules are affected
  const affectedModules = regenerateAll
    ? modules
    : modules.filter((m) =>
        changedFiles.some((f) => matchesGlobs(f, m.sourceGlobs))
      );

  if (affectedModules.length === 0) {
    console.log('[Living Docs] No modules affected by this commit.');
    process.exit(0);
  }

  console.log(`[Living Docs] Regenerating ${affectedModules.length} module(s):`);
  for (const m of affectedModules) {
    console.log(`  → ${m.title} (${m.outputPath})`);
  }

  // Ensure output directory
  if (!existsSync(LIVING_DOCS_DIR)) {
    mkdirSync(LIVING_DOCS_DIR, { recursive: true });
  }

  // Boot kernel
  let kernel: TrellisKernel | null = null;
  try {
    if (existsSync(OPS_PATH)) {
      kernel = createKernel();
    }
  } catch (err) {
    console.warn('[Living Docs] Could not boot kernel:', err);
  }

  // If no kernel, create a minimal stub
  if (!kernel) {
    const { TrellisKernel: TK } = await import('../packages/trellis-kernel/kernel/trellis-kernel.js');
    kernel = new TK();
  }

  try {
    for (const module of affectedModules) {
      const outPath = resolve(PROJECT_ROOT, module.outputPath);
      const outDir = resolve(outPath, '..');
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      // Read existing content for manual section preservation
      const existingContent = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : '';

      // Build the document
      const content = buildDocument(module, kernel, existingContent);
      writeFileSync(outPath, content, 'utf-8');
      console.log(`[Living Docs] Written: ${module.outputPath}`);
    }
  } finally {
    kernel?.close();
  }

  // Amend the commit if running from post-commit hook
  if (!noAmend) {
    amendCommit();
  }
}

// Only run main when executed directly (not when imported by tests)
const isDirectRun = import.meta.url === Bun.main || process.argv[1]?.endsWith('tql-docs-sync.ts');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[Living Docs] Error:', err);
    process.exit(1);
  });
}

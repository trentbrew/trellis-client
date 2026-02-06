#!/usr/bin/env bun

/**
 * TQL (Traversable Query Language) CLI
 *
 * A powerful CLI tool that combines the orchestrator and query engine
 * to process natural language queries on JSON data from files or URLs
 */
import { readFileSync } from 'fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'path';
import { Command } from 'commander';

import { TrellisKernel } from '../kernel/trellis-kernel.js';
import { SqliteKernelBackend } from '../persist/sqlite-backend.js';
import {
  initTelemetry,
  shutdownTelemetry,
  trackCommand,
} from '../telemetry.js';
import { WorkflowEngine } from '../workflows/engine.js';
import {
  addRelation,
  appendToArrayField,
  applyFieldPairs,
  findGraphNode,
  generateEntityId,
  readGraphJsonld,
  removeRelation,
  setNodeField,
  upsertNode,
  writeGraphJsonld,
} from './project-brain.js';
import { TQLREPL } from './repl.js';

interface TQLOptions {
  data: string;
  query: string;
  format: 'json' | 'table' | 'csv';
  limit: number;
  verbose: boolean;
  catalog: boolean;
  raw: boolean;
  type?: string;
  idKey?: string;
}

export class TQLCLI {
  private kernel: TrellisKernel;

  constructor() {
    this.kernel = new TrellisKernel();
  }

  getStore() {
    return this.kernel.getStore();
  }

  async loadData(source: string, options: TQLOptions): Promise<void> {
    if (!options.raw) {
      console.log(`📥 Loading data from: ${source}`);
    }

    let jsonData: any;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Load from URL
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch data from URL: ${response.statusText}`,
        );
      }
      jsonData = await response.json();
    } else {
      // Load from local file
      try {
        const filePath = resolve(process.cwd(), source);
        const fileContent = readFileSync(filePath, 'utf-8');
        jsonData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error(
          `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Ingest data into the kernel
    await this.kernel.boot(jsonData, {
      entityType: options.type,
      idKey: options.idKey,
    });

    if (!options.raw) {
      console.log(`✅ Loaded data successfully`);
      console.log(`📊 Store stats:`, this.kernel.getStore().getStats());
    }
  }

  async processQuery(query: string, options: TQLOptions): Promise<void> {
    // Parse and compile EQL-S query
    if (!options.raw) {
      console.log('🔍 Executing query...');
    }
    const result = await this.kernel.query(query);

    // Apply limit (though kernel query handles it if EQL-S has it, CLI might have an override)
    let rows = result.rows;
    if (options.limit > 0) {
      rows = rows.slice(0, options.limit);
    }

    // Display results
    this.displayResults(rows, options, result.executionTime);
  }

  private applyProjectionMap(
    bindings: Record<string, any>[],
    projectionMap: Map<string, string>,
  ): Record<string, any>[] {
    if (projectionMap.size === 0) {
      return bindings;
    }

    return bindings.map((binding) => {
      const projected: Record<string, any> = {};

      for (const [originalField, outputVar] of projectionMap) {
        const value = binding[outputVar];
        if (value !== undefined) {
          projected[originalField] = value;
        } else {
          // Fallback to original field if outputVar not found
          projected[originalField] = binding[originalField];
        }
      }

      return projected;
    });
  }

  private displayResults(
    results: Record<string, any>[],
    options: TQLOptions,
    executionTime: number,
  ): void {
    // Skip annotations for raw output
    if (!options.raw) {
      console.log(
        `\n📊 Query Results (${results.length} rows, ${executionTime.toFixed(2)}ms)`,
      );
      console.log('='.repeat(60));
    }

    if (results.length === 0) {
      if (!options.raw) {
        console.log('No results found.');
      } else {
        console.log('[]');
      }
      return;
    }

    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;

      case 'csv':
        this.displayCSV(results);
        break;

      case 'table':
      default:
        this.displayTable(results);
        break;
    }
  }

  private displayTable(results: Record<string, any>[]): void {
    if (results.length === 0) return;

    // Get all unique keys
    const allKeys = new Set<string>();
    for (const result of results) {
      for (const key of Object.keys(result)) {
        allKeys.add(key);
      }
    }

    const keys = Array.from(allKeys).sort();

    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const key of keys) {
      widths[key] = Math.max(key.length, 8);
    }

    for (const result of results) {
      for (const key of keys) {
        const value = String(result[key] || '');
        widths[key] = Math.max(widths[key]!, value.length);
      }
    }

    // Print header
    let header = '';
    for (const key of keys) {
      header += key.padEnd(widths[key]! + 2);
    }
    console.log(header);
    console.log('-'.repeat(header.length));

    // Print rows
    for (const result of results) {
      let row = '';
      for (const key of keys) {
        const value = String(result[key] || '');
        row += value.padEnd(widths[key]! + 2);
      }
      console.log(row);
    }
  }

  private displayCSV(results: Record<string, any>[]): void {
    if (results.length === 0) return;

    // Get all unique keys
    const allKeys = new Set<string>();
    for (const result of results) {
      for (const key of Object.keys(result)) {
        allKeys.add(key);
      }
    }

    const keys = Array.from(allKeys).sort();

    // Print header
    console.log(keys.join(','));

    // Print rows
    for (const result of results) {
      const row = keys.map((key) => {
        const value = result[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      console.log(row.join(','));
    }
  }

  showCatalog(): void {
    console.log('\n📋 Data Catalog');
    console.log('='.repeat(60));

    const catalog = this.kernel.getStore().getCatalog();
    const entries = catalog.sort(
      (a: any, b: any) => b.distinctCount - a.distinctCount,
    );

    for (const entry of entries) {
      console.log(`\n${entry.attribute}`);
      console.log(`  Type: ${entry.type}`);
      console.log(`  Cardinality: ${entry.cardinality}`);
      console.log(`  Distinct values: ${entry.distinctCount}`);
      if (entry.min !== undefined && entry.max !== undefined) {
        console.log(`  Range: ${entry.min} - ${entry.max}`);
      }
      console.log(`  Examples: ${entry.examples.slice(0, 3).join(', ')}`);
    }
  }

  async run(options: TQLOptions): Promise<void> {
    try {
      // Load data
      await this.loadData(options.data, options);

      // Show catalog if requested explicitly
      if (options.catalog) {
        this.showCatalog();
        return;
      }

      // Process query
      await this.processQuery(options.query, options);
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      process.exit(1);
    }
  }
}

// Initialize telemetry
initTelemetry();

// CLI setup
const program = new Command();

program
  .name('tql')
  .description('Traversable Query Language - Query JSON data with EQL-S')
  .version('1.1.0')
  .allowUnknownOption(false)
  .showHelpAfterError(true);

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

async function writeFileIfAllowed(
  filePath: string,
  contents: string,
  force: boolean,
): Promise<'written' | 'skipped'> {
  const exists = await pathExists(filePath);
  if (exists && !force) return 'skipped';
  await writeFile(filePath, contents);
  return 'written';
}

function buildProjectJson(args: {
  name: string;
  description?: string;
  repository?: string;
  createdAt: string;
}): string {
  const project = {
    schemaVersion: '1.0.0',
    name: args.name,
    description: args.description,
    repository: args.repository,
    createdAt: args.createdAt,
    ontology: {
      context: 'file://./ontology/context.jsonld',
    },
    statusEnums: {
      Goal: ['draft', 'active', 'done', 'canceled'],
      Milestone: ['draft', 'active', 'done', 'canceled'],
      Spec: ['draft', 'active', 'done', 'canceled'],
      Task: ['todo', 'in_progress', 'blocked', 'done', 'canceled'],
      Decision: ['proposed', 'accepted', 'superseded'],
      Note: ['active', 'archived'],
      Source: ['active', 'archived'],
      Artifact: ['active', 'archived'],
    },
  };

  return JSON.stringify(project, null, 2) + '\n';
}

function buildGraphJsonld(args: {
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  owner: string;
}): string {
  const graph = {
    '@context': {
      '@vocab': 'https://tql.dev/ontology/v1#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
    '@graph': [
      {
        '@id': args.projectId,
        '@type': 'Project',
        title: args.name,
        description: args.description ?? '',
        status: 'active',
        createdAt: args.createdAt,
        updatedAt: args.createdAt,
        owners: [args.owner],
        tags: ['tql', 'project'],
      },
    ],
  };

  return JSON.stringify(graph, null, 2) + '\n';
}

function buildTqlWorkflowContract(): string {
  return `# TQL Project Brain: Agent Operating Contract

## Source of truth

- The project planning state lives in \`.tql/\`.
- Treat \`.tql/graph.jsonld\` as canonical structured state.
- Treat \`.tql/docs/\` as canonical longform content (specs/notes/decisions).

## Tooling rules (critical)

- Do NOT manually edit \`.tql/graph.jsonld\`.
- Initialize a project brain with \`tql init\`.
- Query the graph with:
  - \`tql -d .tql/graph.jsonld -q 'FIND Task AS ?t WHERE ?t.status = "todo" RETURN ?t.title'\`
  - \`tql -d .tql/graph.jsonld -c\` to show the catalog
- Mutate the graph with:
  - \`tql add Task --title "..." --field status=todo\`
  - \`tql status <taskId> in_progress\`
  - \`tql set <entityId> key=value\`
  - \`tql link <fromId> dependsOn <toId>\`
  - \`tql unlink <fromId> dependsOn <toId>\`
  - \`tql attach artifact <entityId> <url>\`

## Mutation safety (important)

- Prefer one write command at a time.
- After any write, immediately run a read-only verification:
  - \`tql show <id>\`
  - \`tql list Task --status todo,in_progress,blocked\`
  - \`tql -d .tql/graph.jsonld -q '...'\`
- Avoid large chained \`cmd1 && cmd2 && ...\` write batches; they are hard to review/approve and hard to recover from.
- If batching is necessary, keep it small (3-5 commands max) and include verification between batches.

## When asked to plan work

1. Create or update:
   - Goal -> Milestones -> Tasks
2. Link dependencies:
   - \`dependsOn\`, \`blocks\`, \`implements\`
3. Ensure every task has:
   - a clear title
   - status
   - owners (human/agent)
4. If information is missing, create a \`Question\` entity rather than guessing.

## When implementing code changes

1. Identify the relevant task(s):
   - \`tql list tasks --status todo,in_progress,blocked\`
2. Mark the active task \`in_progress\`:
   - \`tql status <taskId> in_progress\`
3. As you discover edge cases, record:
   - \`Note\` (facts) and \`Decision\` (choices + rationale).
4. When work is complete:
   - mark the task \`done\`
   - attach evidence (PR/commit/trace/url) via \`tql attach artifact <taskId> <url>\`

## When blocked or uncertain

- Create a \`Question\` entity describing what you need.
- Link it to the blocked task with \`blocks\`.
- Set task status to \`blocked\` with a reason.

## Hygiene

- Prefer small, composable tasks.
- Keep decisions explicit (Decision nodes) so future agents don't repeat reasoning.
`;
}

function buildAgentWorkflowMarkdown(): string {
  return buildTqlWorkflowContract();
}

function normalizeTypeArg(type: string | undefined): string | undefined {
  if (!type) return undefined;
  const trimmed = type.trim();
  if (!trimmed) return undefined;

  const singular = trimmed.endsWith('s')
    ? trimmed.slice(0, Math.max(0, trimmed.length - 1))
    : trimmed;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function defaultGraphPath(): string {
  return '.tql/graph.jsonld';
}

function resolveCwdPath(p: string): string {
  return resolve(process.cwd(), p);
}

function buildTemplateMarkdown(kind: 'spec' | 'decision' | 'note'): string {
  if (kind === 'spec') {
    return (
      '# Spec\n\n' +
      '## Context\n\n' +
      '## Requirements\n\n' +
      '## Non-goals\n\n' +
      '## UX\n\n' +
      '## API / Data\n\n' +
      '## Risks\n\n'
    );
  }
  if (kind === 'decision') {
    return (
      '# Decision\n\n' +
      '## Decision\n\n' +
      '## Rationale\n\n' +
      '## Alternatives Considered\n\n' +
      '## Consequences\n\n'
    );
  }
  return '# Note\n\n';
}

function buildDotTqlGitignore(): string {
  return 'cache/\nlog/\n';
}

function buildOntologyContextJsonld(): string {
  const context = {
    '@context': {
      '@vocab': 'https://tql.dev/ontology/v1#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
  };

  return JSON.stringify(context, null, 2) + '\n';
}

program
  .command('init')
  .description('Initialize a .tql project brain in the current directory')
  .argument('[name]', 'Project name (defaults to current folder name)')
  .option('--force', 'Overwrite existing generated files', false)
  .option('--name <name>', 'Project name (defaults to current folder name)')
  .option('--description <text>', 'Project description')
  .option('--repo <url>', 'Repository URL')
  .action(async (nameArg: string | undefined, options: any) => {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      const cwd = process.cwd();
      const force = options.force === true;
      const name =
        nameArg ?? (options.name as string | undefined) ?? basename(cwd);
      const createdAt = new Date().toISOString();
      const owner = `@human:${process.env.USER ?? 'unknown'}`;
      const projectId = `urn:tql:project:${slugify(name) || 'project'}`;

      const rootDir = join(cwd, '.tql');

      await ensureDir(join(rootDir, 'docs', 'specs'));
      await ensureDir(join(rootDir, 'docs', 'notes'));
      await ensureDir(join(rootDir, 'docs', 'decisions'));
      await ensureDir(join(rootDir, 'workflows'));
      await ensureDir(join(rootDir, 'templates'));
      await ensureDir(join(rootDir, 'ontology'));
      await ensureDir(join(rootDir, 'cache'));
      await ensureDir(join(rootDir, 'log'));
      await ensureDir(join(cwd, '.windsurf', 'workflows'));

      const results: Array<{ file: string; status: 'written' | 'skipped' }> =
        [];

      results.push({
        file: join(rootDir, 'project.json'),
        status: await writeFileIfAllowed(
          join(rootDir, 'project.json'),
          buildProjectJson({
            name,
            description: options.description,
            repository: options.repo,
            createdAt,
          }),
          force,
        ),
      });

      results.push({
        file: join(rootDir, '.gitignore'),
        status: await writeFileIfAllowed(
          join(rootDir, '.gitignore'),
          buildDotTqlGitignore(),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'graph.jsonld'),
        status: await writeFileIfAllowed(
          join(rootDir, 'graph.jsonld'),
          buildGraphJsonld({
            projectId,
            name,
            description: options.description,
            createdAt,
            owner,
          }),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'ontology', 'context.jsonld'),
        status: await writeFileIfAllowed(
          join(rootDir, 'ontology', 'context.jsonld'),
          buildOntologyContextJsonld(),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'workflows', 'agent.md'),
        status: await writeFileIfAllowed(
          join(rootDir, 'workflows', 'agent.md'),
          buildAgentWorkflowMarkdown(),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'templates', 'spec.md'),
        status: await writeFileIfAllowed(
          join(rootDir, 'templates', 'spec.md'),
          buildTemplateMarkdown('spec'),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'templates', 'decision.md'),
        status: await writeFileIfAllowed(
          join(rootDir, 'templates', 'decision.md'),
          buildTemplateMarkdown('decision'),
          force,
        ),
      });

      results.push({
        file: join(rootDir, 'templates', 'note.md'),
        status: await writeFileIfAllowed(
          join(rootDir, 'templates', 'note.md'),
          buildTemplateMarkdown('note'),
          force,
        ),
      });

      results.push({
        file: join(cwd, '.windsurf', 'workflows', 'tql.md'),
        status: await writeFileIfAllowed(
          join(cwd, '.windsurf', 'workflows', 'tql.md'),
          buildTqlWorkflowContract(),
          force,
        ),
      });

      const written = results.filter((r) => r.status === 'written').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      console.log(`✅ Initialized .tql in ${rootDir}`);
      console.log(`   Written: ${written}`);
      console.log(`   Skipped: ${skipped}`);
      if (skipped > 0 && !force) {
        console.log('   Use --force to overwrite existing files');
      }

      success = true;
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      errorType = error instanceof Error ? error.constructor.name : 'Unknown';
      process.exitCode = 1;
    } finally {
      const duration = Date.now() - startTime;
      trackCommand('init', undefined, duration, success, errorType);
    }
  });

program
  .command('add')
  .description('Add an entity node to a .tql JSON-LD graph')
  .argument('<type>', 'Entity type (e.g., Task, Milestone, Goal)')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .option('--id <id>', 'Entity @id (defaults to a generated urn)')
  .option('--title <title>', 'Entity title (also used to generate id)')
  .option('--upsert', 'Update if the entity already exists', false)
  .option('--field <key=value...>', 'Set fields (repeatable)', [])
  .action(async (type: string, options: any) => {
    const graphPath = resolveCwdPath(options.graph);
    const entityType = normalizeTypeArg(type) ?? type;
    const entityId =
      (options.id as string | undefined) ??
      generateEntityId(entityType, options.title);

    const base: Record<string, unknown> = {};
    if (options.title) base.title = options.title;
    const data = applyFieldPairs(base, (options.field as string[]) ?? []);

    const doc = await readGraphJsonld(graphPath);
    upsertNode(doc, {
      id: entityId,
      type: entityType,
      data,
      mode: options.upsert === true ? 'upsert' : 'create',
    });
    await writeGraphJsonld(graphPath, doc);
    console.log(
      `✅ ${options.upsert ? 'Upserted' : 'Added'} ${entityType} ${entityId}`,
    );
  });

program
  .command('set')
  .description('Set a field on an existing entity')
  .argument('<id>', 'Entity @id')
  .argument('<field>', 'Field assignment in the form key=value')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .action(async (id: string, field: string, options: any) => {
    const graphPath = resolveCwdPath(options.graph);
    const idx = field.indexOf('=');
    if (idx <= 0) {
      throw new Error(`Invalid field assignment: ${field}. Expected key=value`);
    }
    const key = field.slice(0, idx).trim();
    const value = field.slice(idx + 1);

    const doc = await readGraphJsonld(graphPath);
    const patch = applyFieldPairs({}, [`${key}=${value}`]);
    setNodeField(doc, id, key, patch[key]);
    await writeGraphJsonld(graphPath, doc);
    console.log(`✅ Updated ${id}: ${key}`);
  });

program
  .command('status')
  .description('Set status on an entity (status=<value>)')
  .argument('<id>', 'Entity @id')
  .argument('<status>', 'New status value')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .action(async (id: string, status: string, options: any) => {
    const graphPath = resolveCwdPath(options.graph);
    const doc = await readGraphJsonld(graphPath);
    setNodeField(doc, id, 'status', status);
    await writeGraphJsonld(graphPath, doc);
    console.log(`✅ Updated ${id}: status=${status}`);
  });

program
  .command('link')
  .description('Add a relation between entities (stored as an array field)')
  .argument('<fromId>', 'Source entity @id')
  .argument('<relation>', 'Relation field (e.g., dependsOn, blocks)')
  .argument('<toId>', 'Target entity @id')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .action(
    async (fromId: string, relation: string, toId: string, options: any) => {
      const graphPath = resolveCwdPath(options.graph);
      const doc = await readGraphJsonld(graphPath);
      addRelation(doc, fromId, relation, toId);
      await writeGraphJsonld(graphPath, doc);
      console.log(`✅ Linked ${fromId} ${relation} ${toId}`);
    },
  );

program
  .command('unlink')
  .description('Remove a relation between entities')
  .argument('<fromId>', 'Source entity @id')
  .argument('<relation>', 'Relation field (e.g., dependsOn, blocks)')
  .argument('<toId>', 'Target entity @id')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .action(
    async (fromId: string, relation: string, toId: string, options: any) => {
      const graphPath = resolveCwdPath(options.graph);
      const doc = await readGraphJsonld(graphPath);
      removeRelation(doc, fromId, relation, toId);
      await writeGraphJsonld(graphPath, doc);
      console.log(`✅ Unlinked ${fromId} ${relation} ${toId}`);
    },
  );

const attachCommand = program
  .command('attach')
  .description('Attach evidence/metadata to an entity')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath());

attachCommand
  .command('artifact <id> <url>')
  .description('Attach an artifact URL (appended to artifacts[])')
  .option('-g, --graph <path>', 'Path to graph.jsonld')
  .action(async (id: string, url: string, options: any, command: any) => {
    const graphOpt =
      (options?.graph as string | undefined) ??
      (command?.parent?.opts?.()?.graph as string | undefined) ??
      defaultGraphPath();
    const graphPath = resolveCwdPath(graphOpt);
    const doc = await readGraphJsonld(graphPath);
    appendToArrayField(doc, id, 'artifacts', url);
    await writeGraphJsonld(graphPath, doc);
    console.log(`✅ Attached artifact to ${id}`);
  });

program
  .command('show')
  .description('Show a single entity from a .tql JSON-LD graph')
  .argument('<id>', 'Entity @id')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .action(async (id: string, options: any) => {
    const graphPath = resolveCwdPath(options.graph);
    const doc = await readGraphJsonld(graphPath);
    const found = findGraphNode(doc, id);
    if (!found) {
      console.error(`Not found: ${id}`);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(found.node, null, 2));
  });

program
  .command('list')
  .description('List entities in a .tql JSON-LD graph')
  .argument('[type]', 'Optional type filter (e.g., Task, tasks)')
  .option('-g, --graph <path>', 'Path to graph.jsonld', defaultGraphPath())
  .option(
    '--status <statuses>',
    'Comma-separated status filter (e.g., todo,in_progress)',
  )
  .option('--json', 'Output as JSON', false)
  .action(async (type: string | undefined, options: any) => {
    const graphPath = resolveCwdPath(options.graph);
    const doc = await readGraphJsonld(graphPath);

    const typeFilter = normalizeTypeArg(type);
    const statuses =
      typeof options.status === 'string' && options.status.trim().length > 0
        ? options.status.split(',').map((s: string) => s.trim())
        : undefined;

    const rows = doc['@graph'].filter((n) => {
      if (!n || typeof n !== 'object') return false;
      const t = n['@type'];
      const typeOk =
        !typeFilter ||
        (typeof t === 'string'
          ? t === typeFilter
          : Array.isArray(t)
            ? t.includes(typeFilter)
            : false);

      if (!typeOk) return false;
      if (!statuses) return true;
      const st = (n as any).status;
      return typeof st === 'string' && statuses.includes(st);
    });

    if (options.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    console.table(
      rows.map((n) => ({
        id: n['@id'],
        type: Array.isArray(n['@type']) ? n['@type'].join(',') : n['@type'],
        title: (n as any).title,
        status: (n as any).status,
      })),
    );
  });

// Add workflow subcommand FIRST
const workflowCommand = program
  .command('workflow')
  .alias('wf')
  .description('Execute workflow files');

workflowCommand
  .command('run <file>')
  .description('Run a workflow from YAML file')
  .option(
    '--dry',
    'Dry run mode (validates workflow, fetches data, processes queries, but skips file writes)',
    false,
  )
  .option('--watch', 'Watch file for changes and re-run', false)
  .option('--max-rows <number>', 'Limit rows per step')
  .option('--var <key=value...>', 'Set template variables', [])
  .option('--cache <mode>', 'Cache mode: read|write|off', 'write')
  .option('--log <format>', 'Log format: pretty|json', 'pretty')
  .option(
    '--no-color',
    '[DEPRECATED] No-op: output is always plain text',
    false,
  )
  .option('--out <dir>', 'Output directory', './out')
  .action(async (file: string, options: any) => {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      // Parse variables
      const vars: Record<string, string> = {};
      for (const varStr of options.var || []) {
        const [key, ...valueParts] = varStr.split('=');
        if (key && valueParts.length > 0) {
          vars[key] = valueParts.join('=');
        }
      }

      // Show deprecation warning for --no-color
      if (options.color === false) {
        console.warn(
          '⚠️  --no-color is deprecated: output is always plain text',
        );
      }

      const engine = new WorkflowEngine({
        dry: options.dry,
        watch: options.watch,
        limit: options.maxRows ? parseInt(options.maxRows) : undefined,
        vars,
        cache: options.cache as 'read' | 'write' | 'off',
        log: options.log as 'pretty' | 'json',
        out: options.out,
      });

      await engine.executeWorkflowFile(file);
      success = true;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      errorType = error instanceof Error ? error.constructor.name : 'Unknown';
      process.exit(1);
    } finally {
      const duration = Date.now() - startTime;
      trackCommand('workflow', 'run', duration, success, errorType);
    }
  });

// Add plan command
workflowCommand
  .command('plan <file>')
  .description('Show execution plan for a workflow')
  .option('--var <key=value...>', 'Set template variables', [])
  .option('--dot', 'Output as Graphviz DOT format')
  .option('--mermaid', 'Output as Mermaid format')
  .option('--json', 'Output as JSON format')
  .action(async (file: string, options: any) => {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      // Parse variables
      const vars: Record<string, string> = {};
      for (const varStr of options.var || []) {
        const [key, ...valueParts] = varStr.split('=');
        if (key && valueParts.length > 0) {
          vars[key] = valueParts.join('=');
        }
      }

      const { readFile } = await import('fs/promises');
      const { parseWorkflow } = await import('../workflows/parser.js');
      const { createExecutionPlan } = await import('../workflows/planner.js');

      const yamlContent = await readFile(file, 'utf-8');
      const spec = parseWorkflow(yamlContent);
      const plan = createExecutionPlan(spec);

      if (options.dot) {
        console.log(generateDotGraph(plan));
      } else if (options.mermaid) {
        console.log(generateMermaidGraph(plan));
      } else if (options.json) {
        const jsonPlan = {
          name: spec.name,
          version: spec.version,
          steps: plan.order.map((stepId) => {
            const step = spec.steps.find((s) => s.id === stepId);
            const stepInfo: any = {
              id: stepId,
              type: step?.type,
              needs: step?.needs || [],
              from: step?.type === 'query' ? (step as any).from : undefined,
              out: step?.out,
            };

            // Add source.kind for source steps
            if (step?.type === 'source' && 'source' in step) {
              stepInfo.source = {
                kind: step.source.kind,
                mode: step.source.mode,
                url: step.source.url,
              };
            }

            return stepInfo;
          }),
        };
        console.log(JSON.stringify(jsonPlan, null, 2));
      } else {
        console.log('📋 Workflow Execution Plan\n');
        console.log(`Name: ${spec.name}`);
        console.log(`Version: ${spec.version}\n`);

        console.log('Execution Order:');
        plan.order.forEach((stepId, index) => {
          const step = spec.steps.find((s) => s.id === stepId);
          if (step) {
            const needs = step.needs?.length
              ? ` (needs: ${step.needs.join(', ')})`
              : '';
            const from =
              step.type === 'query' && (step as any).from
                ? ` (from: ${(step as any).from})`
                : '';
            const out = step.out ? ` → ${step.out}` : '';
            console.log(
              `  ${index + 1}. ${stepId} [${step.type}]${needs}${from}${out}`,
            );
          }
        });
      }
      success = true;
    } catch (error) {
      console.error('Failed to plan workflow:', error);
      errorType = error instanceof Error ? error.constructor.name : 'Unknown';
      process.exit(1);
    } finally {
      const duration = Date.now() - startTime;
      trackCommand('workflow', 'plan', duration, success, errorType);
    }
  });

// Main query command as default action
program
  .command('repl')
  .description('Start an interactive REPL session')
  .option('-d, --data <source>', 'Initial data source to load')
  .option('--db <file>', 'Use a persistent SQLite database')
  .action(async (options: any) => {
    let backend: SqliteKernelBackend | undefined;
    if (options.db) {
      backend = new SqliteKernelBackend({ filename: options.db });
    }

    const kernel = new TrellisKernel({ backend });

    if (options.data) {
      const filePath = resolve(process.cwd(), options.data);
      const fileContent = readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      await kernel.boot(jsonData);
    }

    const repl = new TQLREPL(kernel);
    await repl.start();
  });

program
  .option('-d, --data <source>', 'Data source (file path or URL)')
  .option('-q, --query <query>', 'Query in EQL-S format or natural language')
  .option('-f, --format <format>', 'Output format (json|table|csv)', 'table')
  .option('-l, --limit <number>', 'Limit number of results', '0')
  .option('-v, --verbose', 'Verbose output', false)
  .option('-c, --catalog', 'Show data catalog instead of querying', false)
  .option(
    '-r, --raw',
    'Raw output without annotations (useful for piping)',
    false,
  )
  .option('--type <name>', 'Force entity type label (e.g., user, post)')
  .option('--id-key <key>', 'Choose id field if not "id"')
  .action(async (options: any) => {
    // Only run query action if data is provided and we're not running a subcommand
    if (options.data) {
      // Validate that query is provided unless showing catalog
      if (!options.catalog && !options.query) {
        console.error(
          'Error: Query is required unless showing catalog with -c option',
        );
        process.exit(1);
      }

      const tql = new TQLCLI();
      await tql.run({
        data: options.data,
        query: options.query || '',
        format: options.format,
        limit: parseInt(options.limit) || 0,
        verbose: options.verbose,
        catalog: options.catalog,
        raw: options.raw,
        type: options.type,
        idKey: options.idKey,
      });
    } else if (process.argv.length === 2) {
      // No arguments, show help
      program.help();
    }
  });

// Add examples
program.addHelpText(
  'after',
  `
Examples:
  # Initialize a .tql project brain
  tql init

  # Query a .tql JSON-LD project brain (after tql init)
  tql -d .tql/graph.jsonld -q 'FIND Task AS ?t WHERE ?t.status = "todo" RETURN ?t.title'

  # Query local JSON file with EQL-S
  tql -d data/posts.json -q "FIND post AS ?p WHERE ?p.views > 1000 RETURN ?p, ?p.title"

  # Show data catalog
  tql -d data/users.json -c

  # Export results as CSV
  tql -d data/products.json -q "FIND product AS ?p WHERE ?p.price > 100 RETURN ?p.name, ?p.price" -f csv

  # Limit results
  tql -d data/posts.json -q "FIND post AS ?p RETURN ?p" --limit 10

  # Run workflow
  tql workflow run examples/workflows/webfonts-serifs.yml --dry --max-rows 10

EQL-S Query Examples:
  # Find posts with specific tags
  FIND post AS ?p WHERE "crime" IN ?p.tags AND ?p.reactions.likes > 1000

  # Find users by email domain
  FIND user AS ?u WHERE ?u.email CONTAINS "@gmail.com"

  # Find products in price range
  FIND product AS ?p WHERE ?p.price BETWEEN 100 AND 500

  # Find posts with regex pattern
  FIND post AS ?p WHERE ?p.title MATCHES /(storm|forest)/

  # Complex query with ordering and limits
  FIND post AS ?p WHERE ?p.views > 1000 RETURN ?p, ?p.title ORDER BY ?p.views DESC LIMIT 5

Workflow Examples:
  # Run workflow with variables
  tql workflow run workflow.yml --var API_KEY=secret --cache write

  # Dry run with limited data
  tql workflow run workflow.yml --dry --limit 20

  # JSON logging for automation
  tql workflow run workflow.yml --log json
`,
);

// Helper functions for plan visualization
function generateDotGraph(plan: any): string {
  const { steps, order } = plan;
  let dot = 'digraph Workflow {\n';
  dot += '  rankdir=TB;\n';
  dot += '  node [shape=box, style=filled];\n\n';

  // Add nodes
  for (const step of steps) {
    const color =
      step.type === 'source'
        ? 'lightblue'
        : step.type === 'query'
          ? 'lightgreen'
          : 'lightcoral';
    dot += `  "${step.id}" [label="${step.id}\\n[${step.type}]", fillcolor="${color}"];\n`;
  }

  // Add edges
  for (const step of steps) {
    if (step.needs) {
      for (const dep of step.needs) {
        dot += `  "${dep}" -> "${step.id}";\n`;
      }
    }
  }

  dot += '}\n';
  return dot;
}

function generateMermaidGraph(plan: any): string {
  const { steps, order } = plan;
  let mermaid = 'graph TD\n';

  // Add nodes
  for (const step of steps) {
    const shape =
      step.type === 'source'
        ? '((source))'
        : step.type === 'query'
          ? '[query]'
          : '[[output]]';
    mermaid += `  ${step.id}${shape}\n`;
  }

  // Add edges
  for (const step of steps) {
    if (step.needs) {
      for (const dep of step.needs) {
        mermaid += `  ${dep} --> ${step.id}\n`;
      }
    }
  }

  return mermaid;
}

// Parse command line arguments
program.parse();

// Shutdown telemetry on exit
process.on('exit', () => {
  shutdownTelemetry();
});

process.on('SIGINT', () => {
  shutdownTelemetry();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdownTelemetry();
  process.exit(0);
});

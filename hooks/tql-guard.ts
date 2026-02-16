#!/usr/bin/env bun

/**
 * HQ Guard Hook — enforces policies by querying the TQL knowledge graph.
 *
 * Registered on pre_write_code, pre_run_command, pre_user_prompt.
 * Evaluates pattern-based rules + EQL-S policy queries against the kernel.
 * Exit code 2 = block the action.
 */

import { TrellisKernel } from '../packages/tql/kernel/trellis-kernel.js';
import { createKernel, OPS_PATH, TQL_DIR } from './_kernel.js';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

// ── Types ──────────────────────────────────────────────────────────────

interface HookInput {
  agent_action_name: string;
  tool_info: Record<string, any>;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

interface PolicyRule {
  name: string;
  query: string;
  event: string; // which hook events this rule applies to
}

// ── Paths ──────────────────────────────────────────────────────────────

const POLICIES_PATH = resolve(TQL_DIR, 'policies.eqls');
const GRAPH_PATH = resolve(TQL_DIR, 'graph.jsonld');

// ── Built-in Pattern Rules ─────────────────────────────────────────────

// Safe exceptions — commands matching these are allowed even if they match DANGEROUS_COMMANDS.
// Used for known-safe build cache cleanup, server restarts, etc.
const SAFE_COMMAND_EXCEPTIONS = [
  /\brm\s+(-rf|-fr)\s+\S*\.nuxt\b/,       // Allow: rm -rf .nuxt (build cache)
  /\brm\s+(-rf|-fr)\s+\S*\.output\b/,      // Allow: rm -rf .output (build output)
  /\brm\s+(-rf|-fr)\s+\S*node_modules\/\.vite\b/, // Allow: Vite cache cleanup
  /\brm\s+(-rf|-fr)\s+\S*\.data\/trellis\.db\b/,  // Allow: TQL database reset
];

const DANGEROUS_COMMANDS = [
  /\brm\s+(-rf|-fr)\s+[\/~]/i,
  /\bformat\s+[a-z]:/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\b(chmod|chown)\s+(-R\s+)?777\b/,
  />\s*\/dev\/sd[a-z]/,
  /\brm\s+(-rf|-fr)\s+\.\s*$/,
  /\bgit\s+push\s+.*--force\b/,
  /\bdrop\s+(database|table)\b/i,
  /\btruncate\s+table\b/i,
  /(?:^|[|;&]\s*)python3?\s+-c\b/,
  /(?:^|[|;&]\s*)python3?\s+<<\s*/,
  /(?:^|[|;&]\s*)python3?\s+-\s*</,
  /(?:^|[|;&]\s*)python3?\s+<\(/,
];

const SENSITIVE_PATHS = [
  /secrets?\//i,
  /credentials?\//i,
  /\.ssh\//,
  /\.aws\//,
  /private[_-]?key/i,
  /\.pem$/,
  /\.key$/,
];

const FROZEN_PATHS = [
  /node_modules\//,
  /\.git\//,
  /bun\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
];

// ── Policy Parser ──────────────────────────────────────────────────────

function parsePolicies(content: string): PolicyRule[] {
  const rules: PolicyRule[] = [];
  const lines = content.split('\n');
  let currentRule: { name: string; query: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Rule name comment: -- RULE: name
    const ruleMatch = trimmed.match(/^--\s*RULE:\s*(.+)$/i);
    if (ruleMatch) {
      if (currentRule && currentRule.query) {
        rules.push({ ...currentRule, event: 'all' });
      }
      currentRule = { name: ruleMatch[1]!.trim(), query: '' };
      continue;
    }

    // Skip other comments and empty lines
    if (trimmed.startsWith('--') || trimmed === '') continue;

    // Query line
    if (currentRule) {
      currentRule.query += (currentRule.query ? ' ' : '') + trimmed;
    }
  }

  // Push last rule
  if (currentRule && currentRule.query) {
    rules.push({ ...currentRule, event: 'all' });
  }

  return rules;
}

// ── Service Guard ─────────────────────────────────────────────────────

interface ServiceNode {
  '@id': string;
  '@type': string;
  title: string;
  port?: number;
  url?: string;
  startCommand?: string;
  cwd?: string;
  userManaged?: boolean;
  notes?: string;
}

async function loadServices(): Promise<ServiceNode[]> {
  if (!existsSync(GRAPH_PATH)) return [];
  try {
    const raw = await readFile(GRAPH_PATH, 'utf-8');
    const doc = JSON.parse(raw);
    const nodes = (doc['@graph'] || []) as any[];
    return nodes.filter((n: any) => n['@type'] === 'Service') as ServiceNode[];
  } catch {
    return [];
  }
}

export function checkServiceRules(command: string, services: ServiceNode[]): string | null {
  for (const svc of services) {
    if (!svc.userManaged || !svc.startCommand) continue;

    // Check if command would start this user-managed service
    const startCmd = svc.startCommand;
    if (
      command.includes(startCmd) ||
      command.includes(`cd ${svc.cwd || ''} && ${startCmd}`) ||
      command.includes(`cd ${svc.cwd || ''}; ${startCmd}`)
    ) {
      const checkCmd = svc.url
        ? `curl -s -o /dev/null -w '%{http_code}' ${svc.url}`
        : `lsof -i :${svc.port}`;
      return (
        `Service "${svc.title}" is user-managed. Do not start it.\n` +
        `  → Check if running: ${checkCmd}\n` +
        `  → Port: ${svc.port || 'unknown'}\n` +
        `  → URL: ${svc.url || 'unknown'}`
      );
    }
  }
  return null;
}

// ── Pattern Warnings (non-blocking) ───────────────────────────────────

async function checkPatternWarnings(kernel: TrellisKernel, command: string): Promise<void> {
  try {
    const result = kernel.query('FIND Pattern AS ?p RETURN ?p.name, ?p.trigger, ?p.fix');
    const resolved = result instanceof Promise ? await result : result;
    for (const row of resolved.rows) {
      const trigger = String(row['?p.trigger'] || '');
      const fix = String(row['?p.fix'] || '');
      const name = String(row['?p.name'] || '');
      if (trigger && command.includes(trigger)) {
        console.log(`[HQ Guard] ℹ Known pattern "${name}" applies here.`);
        if (fix) console.log(`  → Consider: ${fix}`);
      }
    }
  } catch {
    // Pattern warnings are best-effort — don't fail on errors
  }
}

// ── Guard Logic ────────────────────────────────────────────────────────

export function checkPatternRules(input: HookInput): string | null {
  const event = input.agent_action_name;

  if (event === 'pre_run_command') {
    const command = input.tool_info.command || input.tool_info.command_line || '';
    const isSafeException = SAFE_COMMAND_EXCEPTIONS.some((p) => p.test(command));
    if (!isSafeException) {
      for (const pattern of DANGEROUS_COMMANDS) {
        if (pattern.test(command)) {
          return `Blocked dangerous command: "${command}" (matched pattern: ${pattern})`;
        }
      }
    }
  }

  if (event === 'pre_write_code') {
    const filePath = input.tool_info.file_path || input.tool_info.path || '';

    for (const pattern of SENSITIVE_PATHS) {
      if (pattern.test(filePath)) {
        return `Blocked write to sensitive path: "${filePath}" (matched: ${pattern})`;
      }
    }

    for (const pattern of FROZEN_PATHS) {
      if (pattern.test(filePath)) {
        return `Blocked write to frozen path: "${filePath}" (matched: ${pattern})`;
      }
    }
  }

  return null;
}

async function checkPolicyRules(kernel: TrellisKernel, input: HookInput, rules: PolicyRule[]): Promise<string | null> {
  for (const rule of rules) {
    try {
      // Substitute context variables into the query
      let query = rule.query;
      const filePath = input.tool_info.file_path || input.tool_info.path || '';
      const command = input.tool_info.command || input.tool_info.command_line || '';
      const prompt = input.tool_info.prompt || '';

      query = query.replace(/\$file_path/g, filePath);
      query = query.replace(/\$command/g, command);
      query = query.replace(/\$prompt/g, prompt);

      const result = kernel.query(query);
      const resolved = result instanceof Promise ? await result : result;

      if (resolved.rows.length > 0) {
        return `Policy "${rule.name}" triggered: ${resolved.rows.length} matching entities found`;
      }
    } catch (err) {
      // Don't block on query errors — log and continue
      console.error(`[HQ Guard] Warning: Policy "${rule.name}" query failed:`, err);
    }
  }

  return null;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const raw = await Bun.stdin.text();

  let input: HookInput;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error('[HQ Guard] Failed to parse hook input:', err);
    process.exit(1);
  }

  // 1. Check built-in pattern rules (fast, no DB needed)
  const patternBlock = checkPatternRules(input);
  if (patternBlock) {
    console.error(`[HQ Guard] BLOCKED: ${patternBlock}`);
    process.exit(2);
  }

  // 2. Check service guard (reads graph.jsonld for user-managed services)
  if (input.agent_action_name === 'pre_run_command') {
    const command = input.tool_info.command || input.tool_info.command_line || '';
    const services = await loadServices();
    const serviceBlock = checkServiceRules(command, services);
    if (serviceBlock) {
      console.error(`[HQ Guard] BLOCKED: ${serviceBlock}`);
      process.exit(2);
    }
  }

  // 3. Check EQL-S policy rules (requires kernel)
  if (existsSync(OPS_PATH) && existsSync(POLICIES_PATH)) {
    let kernel: TrellisKernel | null = null;

    try {
      const policyContent = await readFile(POLICIES_PATH, 'utf-8');
      const rules = parsePolicies(policyContent);

      if (rules.length > 0) {
        kernel = createKernel();

        const policyBlock = await checkPolicyRules(kernel, input, rules);
        if (policyBlock) {
          console.error(`[HQ Guard] BLOCKED: ${policyBlock}`);
          kernel.close();
          process.exit(2);
        }
      }
    } catch (err) {
      console.error('[HQ Guard] Warning: Policy check failed:', err);
    } finally {
      kernel?.close();
    }
  }

  // All checks passed
  console.log(`[HQ Guard] ${input.agent_action_name} → allowed`);
  process.exit(0);
}

main();

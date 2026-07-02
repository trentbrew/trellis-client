#!/usr/bin/env bun

/**
 * Response archiver — saves every Cascade response as a structured JSON-LD
 * decision trace for auditing, querying, and graph integration.
 *
 * Extracts actions (file reads, edits, searches, verifications),
 * decisions (rationale statements), and artifacts from the response text.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { TRELLIS_HQ_DIR, HQ_REL_PATH } from './_kernel.js';

interface ResponseToolInfo {
  response: string;
}

interface HookInput {
  agent_action_name: string;
  tool_info: ResponseToolInfo;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}


const ARCHIVE_DIR = resolve(TRELLIS_HQ_DIR, 'cascade-archive');

// ── Parsing helpers ────────────────────────────────────────────────────

interface ExtractedAction {
  '@type': string;
  [key: string]: unknown;
}

interface ExtractedDecision {
  '@type': string;
  'tql:description': string;
  'tql:rationale'?: string;
}

interface ExtractedSection {
  '@type': string;
  'tql:heading': string;
  'tql:actions': ExtractedAction[];
  'tql:decisions': ExtractedDecision[];
}

export function extractActions(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];

  // File views: *Viewed file:///path*
  const viewRe = /\*Viewed file:\/\/\/(.*?)\*/g;
  for (const m of text.matchAll(viewRe)) {
    actions.push({ '@type': 'tql:FileRead', 'tql:path': m[1] });
  }

  // File edits: *Edited relevant file* or *Edited file*
  const editRe = /\*Edited (?:relevant )?file\*/g;
  for (const _ of text.matchAll(editRe)) {
    actions.push({ '@type': 'tql:FileEdit' });
  }

  // Grep / code search
  const grepRe = /\*(?:Grep searched|Searched) (?:codebase|filesystem)\*/g;
  for (const _ of text.matchAll(grepRe)) {
    actions.push({ '@type': 'tql:CodeSearch' });
  }

  // MCP tool runs
  const mcpRe = /\*Running MCP tool\*/g;
  for (const _ of text.matchAll(mcpRe)) {
    actions.push({ '@type': 'tql:MCPToolRun' });
  }

  // Command runs: *User accepted the command `...`*
  const cmdRe = /\*User accepted the command `(.*?)`\*/g;
  for (const m of text.matchAll(cmdRe)) {
    actions.push({ '@type': 'tql:CommandRun', 'tql:command': m[1] });
  }

  // Browser preview
  const previewRe = /\*Ran preview\*/g;
  for (const _ of text.matchAll(previewRe)) {
    actions.push({ '@type': 'tql:BrowserPreview' });
  }

  // Todo list updates
  const todoRe = /\*Updated todo list\*/g;
  for (const _ of text.matchAll(todoRe)) {
    actions.push({ '@type': 'tql:TodoUpdate' });
  }

  return actions;
}

export function extractDecisions(text: string): ExtractedDecision[] {
  const decisions: ExtractedDecision[] = [];
  const decisionPatterns = [
    /(?:I'm choosing|chose|decided|going with|using|approach)\s+(.{20,120}?)(?:\.|$)/gi,
    /(?:instead of|rather than)\s+(.{20,120}?)(?:\.|$)/gi,
    /(?:because|since|rationale:)\s+(.{20,120}?)(?:\.|$)/gi,
  ];

  for (const re of decisionPatterns) {
    for (const m of text.matchAll(re)) {
      const desc = m[0].trim().replace(/\*+/g, '');
      if (desc.length > 15) {
        decisions.push({
          '@type': 'tql:Decision',
          'tql:description': desc,
        });
      }
    }
  }

  return decisions;
}

export function extractSections(text: string): ExtractedSection[] {
  // Split on ### headings (Planner Response, etc.)
  const parts = text.split(/^### /gm).filter(Boolean);

  if (parts.length <= 1) {
    // No sections found — treat whole text as one section
    return [{
      '@type': 'tql:ResponseSection',
      'tql:heading': 'Response',
      'tql:actions': extractActions(text),
      'tql:decisions': extractDecisions(text),
    }];
  }

  return parts.map((part) => {
    const firstLine = part.split('\n')[0] || 'Response';
    return {
      '@type': 'tql:ResponseSection',
      'tql:heading': firstLine.trim(),
      'tql:actions': extractActions(part),
      'tql:decisions': extractDecisions(part),
    };
  });
}

export function extractArtifacts(text: string): Record<string, unknown>[] {
  const artifacts: Record<string, unknown>[] = [];

  // File paths mentioned in file:/// references
  const fileRefs = new Set<string>();
  const fileRefRe = /file:\/\/\/([\w/.@\-]+)/g;
  for (const m of text.matchAll(fileRefRe)) {
    fileRefs.add(m[1]!);
  }
  for (const path of fileRefs) {
    artifacts.push({ '@type': 'tql:FileReferenced', 'tql:path': path });
  }

  // Bug fixes mentioned
  const bugRe = /(?:fix(?:ed)?|bug fix|resolved):?\s+(.{10,100}?)(?:\.|$)/gi;
  for (const m of text.matchAll(bugRe)) {
    artifacts.push({ '@type': 'tql:BugFixed', 'tql:description': m[1]!.trim() });
  }

  return artifacts;
}

export function extractVerification(text: string): Record<string, unknown> {
  const verification: Record<string, unknown> = { '@type': 'tql:VerificationResult' };

  // Console error/warning counts
  const errorMatch = text.match(/(\d+)\s*(?:console\s+)?errors?/i);
  if (errorMatch) verification['tql:consoleErrors'] = parseInt(errorMatch[1]!, 10);

  const warnMatch = text.match(/(\d+)\s*(?:console\s+)?warnings?/i);
  if (warnMatch) verification['tql:consoleWarnings'] = parseInt(warnMatch[1]!, 10);

  // Browser tested
  if (/browser|preview|localhost|verified/i.test(text)) {
    verification['tql:browserTested'] = true;
  }

  return verification;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const input = await Bun.stdin.text();

  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error('[ARCHIVER] Failed to parse input:', err);
    process.exit(1);
  }

  const date = new Date(data.timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0]!.replace(/:/g, '-');
  const execShort = data.execution_id.slice(0, 8);

  const fileName = `${dateStr}_${timeStr}_${execShort}.jsonld`;
  const filePath = `${ARCHIVE_DIR}/${fileName}`;

  // Ensure archive directory exists
  if (!existsSync(ARCHIVE_DIR)) {
    mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  const responseText = data.tool_info.response || '';
  const wordCount = responseText.split(/\s+/).filter(Boolean).length;

  // Build structured JSON-LD
  const jsonld = {
    '@context': {
      'tql': 'https://trellis.dev/ns/',
      'schema': 'https://schema.org/',
      'prov': 'http://www.w3.org/ns/prov#',
    },
    '@id': `tql:response:${execShort}`,
    '@type': ['tql:AgentResponse', 'prov:Activity'],
    'tql:trajectoryId': data.trajectory_id,
    'tql:executionId': data.execution_id,
    'schema:dateCreated': data.timestamp,
    'tql:session': { '@id': `tql:session:${data.trajectory_id}` },
    'tql:content': {
      '@type': 'tql:ResponseContent',
      'tql:wordCount': wordCount,
      'tql:sections': extractSections(responseText),
    },
    'tql:artifacts': extractArtifacts(responseText),
    'tql:verification': extractVerification(responseText),
  };

  writeFileSync(filePath, JSON.stringify(jsonld, null, 2), 'utf-8');

  console.log(`[ARCHIVER] Decision trace saved: ${HQ_REL_PATH}/cascade-archive/${fileName}`);
  console.log(`  → Trajectory: ${data.trajectory_id}`);
  console.log(`  → Words: ${wordCount} | Sections: ${jsonld['tql:content']['tql:sections'].length} | Artifacts: ${jsonld['tql:artifacts'].length}`);
  process.exit(0);
}

main();

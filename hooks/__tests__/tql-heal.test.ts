import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  checkDirectoryExists,
  checkWorkspaceJson,
  checkOpsJsonl,
} from '../tql-heal.js';

describe('checkDirectoryExists', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-heal-dir-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when directory exists', () => {
    const result = checkDirectoryExists(tmpDir);
    expect(result).toBeNull();
  });

  it('creates directory and returns success when missing', () => {
    const missingDir = join(tmpDir, 'missing', 'deep');
    const result = checkDirectoryExists(missingDir);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.issue).toContain('missing');
    expect(existsSync(missingDir)).toBe(true);
  });
});

describe('checkWorkspaceJson', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-heal-ws-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when workspace.json exists and is valid', () => {
    const wsPath = join(tmpDir, 'workspace.json');
    writeFileSync(wsPath, JSON.stringify({ workspace: { name: 'test' } }), 'utf-8');
    const result = checkWorkspaceJson(wsPath);
    expect(result).toBeNull();
  });

  it('regenerates workspace.json when missing', () => {
    const wsPath = join(tmpDir, 'workspace.json');
    const result = checkWorkspaceJson(wsPath);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.issue).toContain('missing');
    expect(existsSync(wsPath)).toBe(true);
    const content = JSON.parse(readFileSync(wsPath, 'utf-8'));
    expect(content.workspace.name).toBe('trellis-client');
  });

  it('replaces corrupted workspace.json', () => {
    const wsPath = join(tmpDir, 'workspace.json');
    writeFileSync(wsPath, 'NOT VALID JSON {{{', 'utf-8');
    const result = checkWorkspaceJson(wsPath);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.issue).toContain('corrupted');
    const content = JSON.parse(readFileSync(wsPath, 'utf-8'));
    expect(content.workspace).toBeDefined();
  });
});

describe('checkOpsJsonl', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-heal-ops-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null for existing valid ops.jsonl', () => {
    const opsPath = join(tmpDir, 'ops.jsonl');
    writeFileSync(opsPath, '{"hash":"h1","kind":"addFacts","timestamp":"2026-01-01T00:00:00Z","agentId":"a"}\n', 'utf-8');
    const result = checkOpsJsonl(opsPath);
    expect(result).toBeNull();
  });

  it('returns null for empty ops.jsonl', () => {
    const opsPath = join(tmpDir, 'ops.jsonl');
    writeFileSync(opsPath, '', 'utf-8');
    const result = checkOpsJsonl(opsPath);
    expect(result).toBeNull();
  });

  it('creates ops.jsonl when missing', () => {
    const opsPath = join(tmpDir, 'ops.jsonl');
    const result = checkOpsJsonl(opsPath);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.issue).toContain('missing');
    expect(existsSync(opsPath)).toBe(true);
  });

  it('removes corrupted lines from ops.jsonl', () => {
    const opsPath = join(tmpDir, 'ops.jsonl');
    const validLine = '{"hash":"h1","kind":"addFacts","timestamp":"2026-01-01T00:00:00Z","agentId":"a"}';
    writeFileSync(opsPath, `${validLine}\nNOT JSON\n${validLine}\n`, 'utf-8');
    const result = checkOpsJsonl(opsPath);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.issue).toContain('corrupted');
    // Should have kept 2 valid lines, removed 1
    const remaining = readFileSync(opsPath, 'utf-8').trim().split('\n').filter(Boolean);
    expect(remaining).toHaveLength(2);
  });

  it('uses snapshot when available for corrupted ops', () => {
    const opsPath = join(tmpDir, 'ops.jsonl');
    const snapshotPath = opsPath.replace(/\.jsonl$/, '.snapshot.json');
    writeFileSync(opsPath, '{"valid":true}\nCORRUPT\n', 'utf-8');
    writeFileSync(snapshotPath, JSON.stringify({ lastOpHash: 'h1', data: {} }), 'utf-8');
    const result = checkOpsJsonl(opsPath);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.action).toContain('snapshot');
    // ops.jsonl should be truncated
    expect(readFileSync(opsPath, 'utf-8')).toBe('');
  });
});

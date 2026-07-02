import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonlKernelBackend } from '../../packages/trellis-kernel/persist/jsonl-backend.js';
import type { KernelOp } from '../../packages/trellis-kernel/persist/backend.js';

function makeOp(overrides: Partial<KernelOp> = {}): KernelOp {
  return {
    hash: `trellis:op:${Math.random().toString(36).slice(2, 10)}`,
    kind: 'addFacts',
    timestamp: new Date().toISOString(),
    agentId: 'test',
    facts: [{ e: 'e1', a: 'title', v: 'hello' }],
    ...overrides,
  };
}

describe('JsonlKernelBackend', () => {
  let tmpDir: string;
  let opsPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-test-'));
    opsPath = join(tmpDir, 'ops.jsonl');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('init creates directory and empty file', () => {
    const nested = join(tmpDir, 'deep', 'nested', 'ops.jsonl');
    const backend = new JsonlKernelBackend({ filename: nested });
    backend.init();
    expect(existsSync(nested)).toBe(true);
    expect(readFileSync(nested, 'utf-8')).toBe('');
  });

  it('append + readAll round-trips a single op', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    const op = makeOp({ hash: 'trellis:op:abc123' });
    backend.append(op);
    const ops = backend.readAll();
    expect(ops).toHaveLength(1);
    expect(ops[0]!.hash).toBe('trellis:op:abc123');
    expect(ops[0]!.kind).toBe('addFacts');
  });

  it('append + readAll round-trips multiple ops', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    const op1 = makeOp({ hash: 'trellis:op:001' });
    const op2 = makeOp({ hash: 'trellis:op:002' });
    const op3 = makeOp({ hash: 'trellis:op:003' });
    backend.append(op1);
    backend.append(op2);
    backend.append(op3);
    const ops = backend.readAll();
    expect(ops).toHaveLength(3);
    expect(ops.map((o) => o.hash)).toEqual([
      'trellis:op:001',
      'trellis:op:002',
      'trellis:op:003',
    ]);
  });

  it('readAll returns empty array for non-existent file', () => {
    const backend = new JsonlKernelBackend({ filename: join(tmpDir, 'nope.jsonl') });
    expect(backend.readAll()).toEqual([]);
  });

  it('readAll returns empty array for empty file', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    expect(backend.readAll()).toEqual([]);
  });

  it('readUntil returns ops up to and including the given hash', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    backend.append(makeOp({ hash: 'h1' }));
    backend.append(makeOp({ hash: 'h2' }));
    backend.append(makeOp({ hash: 'h3' }));
    const until = backend.readUntil('h2');
    expect(until).toHaveLength(2);
    expect(until.map((o) => o.hash)).toEqual(['h1', 'h2']);
  });

  it('readUntil throws for unknown hash', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    backend.append(makeOp({ hash: 'h1' }));
    expect(() => backend.readUntil('nope')).toThrow('not found');
  });

  it('readAfter returns ops after the given hash', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    backend.append(makeOp({ hash: 'h1' }));
    backend.append(makeOp({ hash: 'h2' }));
    backend.append(makeOp({ hash: 'h3' }));
    const after = backend.readAfter('h1');
    expect(after).toHaveLength(2);
    expect(after.map((o) => o.hash)).toEqual(['h2', 'h3']);
  });

  it('readAfter throws for unknown hash', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    expect(() => backend.readAfter('nope')).toThrow('not found');
  });

  it('readUntilTimestamp filters by time', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    backend.append(makeOp({ hash: 'h1', timestamp: '2026-01-01T00:00:00Z' }));
    backend.append(makeOp({ hash: 'h2', timestamp: '2026-01-02T00:00:00Z' }));
    backend.append(makeOp({ hash: 'h3', timestamp: '2026-01-03T00:00:00Z' }));
    const filtered = backend.readUntilTimestamp('2026-01-02T00:00:00Z');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((o) => o.hash)).toEqual(['h1', 'h2']);
  });

  it('getLastOp returns the last op', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    backend.append(makeOp({ hash: 'h1' }));
    backend.append(makeOp({ hash: 'h2' }));
    expect(backend.getLastOp()?.hash).toBe('h2');
  });

  it('getLastOp returns undefined for empty log', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    expect(backend.getLastOp()).toBeUndefined();
  });

  it('saveSnapshot + loadLatestSnapshot round-trips', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    const data = { facts: [{ e: 'x', a: 'y', v: 'z' }], links: [] };
    backend.saveSnapshot('h42', data);
    const loaded = backend.loadLatestSnapshot();
    expect(loaded).toBeDefined();
    expect(loaded!.lastOpHash).toBe('h42');
    expect(loaded!.data).toEqual(data);
  });

  it('loadLatestSnapshot returns undefined when no snapshot exists', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    expect(backend.loadLatestSnapshot()).toBeUndefined();
  });

  it('loadLatestSnapshot returns undefined for corrupted snapshot', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    backend.init();
    const snapshotPath = opsPath.replace(/\.jsonl$/, '.snapshot.json');
    writeFileSync(snapshotPath, 'NOT VALID JSON', 'utf-8');
    expect(backend.loadLatestSnapshot()).toBeUndefined();
  });

  it('close is a no-op and does not throw', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    expect(() => backend.close()).not.toThrow();
  });
});

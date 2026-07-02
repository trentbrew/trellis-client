import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveActiveHqDir } from '../_kernel.js';

describe('HQ path resolution', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'hq-paths-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('prefers .trellis/hq/ops.jsonl when present', () => {
    const hq = join(root, '.trellis', 'hq');
    mkdirSync(hq, { recursive: true });
    writeFileSync(join(hq, 'ops.jsonl'), '{}\n');

    const legacy = join(root, '.tql');
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, 'ops.jsonl'), '{}\n');

    expect(resolveActiveHqDir(root)).toBe(hq);
  });

  it('falls back to .tql/ops.jsonl when canonical missing', () => {
    const legacy = join(root, '.tql');
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, 'ops.jsonl'), '{}\n');

    expect(resolveActiveHqDir(root)).toBe(legacy);
  });

  it('defaults to .trellis/hq when neither ops.jsonl exists', () => {
    expect(resolveActiveHqDir(root)).toBe(join(root, '.trellis', 'hq'));
  });
});

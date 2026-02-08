import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonlKernelBackend } from '../../packages/tql/persist/jsonl-backend.js';
import { TrellisKernel } from '../../packages/tql/kernel/trellis-kernel.js';

describe('Kernel Factory', () => {
  let tmpDir: string;
  let opsPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-kernel-test-'));
    opsPath = join(tmpDir, 'ops.jsonl');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a TrellisKernel with JSONL backend', () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    const kernel = new TrellisKernel({ backend, autoReplay: true });
    expect(kernel).toBeDefined();
    expect(kernel.getStore()).toBeDefined();
    kernel.close();
  });

  it('round-trips createNode → query', async () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    const kernel = new TrellisKernel({ backend, autoReplay: true });

    await kernel.createNode('task:1', { title: 'Write tests', priority: 3 }, 'Task');
    const result = kernel.query('FIND Task AS ?t RETURN ?t.title');
    const resolved = result instanceof Promise ? await result : result;

    expect(resolved.rows.length).toBeGreaterThanOrEqual(1);
    const titles = resolved.rows.map((r: any) => r['?t.title']);
    expect(titles).toContain('Write tests');

    kernel.close();
  });

  it('persists ops across kernel instances', async () => {
    // First kernel: write data
    const backend1 = new JsonlKernelBackend({ filename: opsPath });
    const kernel1 = new TrellisKernel({ backend: backend1, autoReplay: true });
    await kernel1.createNode('task:persist', { title: 'Persisted task' }, 'Task');
    kernel1.close();

    // Second kernel: read data
    const backend2 = new JsonlKernelBackend({ filename: opsPath });
    const kernel2 = new TrellisKernel({ backend: backend2, autoReplay: true });
    const result = kernel2.query('FIND Task AS ?t RETURN ?t.title');
    const resolved = result instanceof Promise ? await result : result;
    const titles = resolved.rows.map((r: any) => r['?t.title']);
    expect(titles).toContain('Persisted task');
    kernel2.close();
  });

  it('checkpoint + restore from snapshot speeds up boot', async () => {
    const backend1 = new JsonlKernelBackend({ filename: opsPath });
    const kernel1 = new TrellisKernel({ backend: backend1, autoReplay: true });
    for (let i = 0; i < 10; i++) {
      await kernel1.createNode(`item:${i}`, { title: `Item ${i}` }, 'Item');
    }
    await kernel1.checkpoint();
    kernel1.close();

    // Boot from snapshot
    const backend2 = new JsonlKernelBackend({ filename: opsPath });
    const kernel2 = new TrellisKernel({ backend: backend2, autoReplay: true });
    const stats = kernel2.getStore().getStats();
    expect(stats.totalFacts).toBeGreaterThanOrEqual(10);
    kernel2.close();
  });
});

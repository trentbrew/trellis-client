import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonlKernelBackend } from '../../packages/trellis-kernel/persist/jsonl-backend.js';
import { TrellisKernel } from '../../packages/trellis-kernel/kernel/trellis-kernel.js';

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

  it('updateNode preserves domain type facts', async () => {
    const backend = new JsonlKernelBackend({ filename: opsPath });
    const kernel = new TrellisKernel({ backend, autoReplay: true });

    // Create a node with EAV type 'entity' and domain type 'integration_connection'
    await kernel.createNode('entity:conn-1', {
      type: 'integration_connection',
      title: 'GCal Connection',
      connectionStatus: 'connected',
    }, 'entity');

    // Partial update — should NOT strip domain type
    await kernel.updateNode('entity:conn-1', {
      lastSyncAt: '2026-02-18T00:00:00Z',
    }, 'entity');

    // Verify domain type is preserved
    const result = kernel.query(
      'FIND entity AS ?c WHERE ?c.type = "integration_connection" RETURN ?c.title, ?c.connectionStatus, ?c.lastSyncAt',
    );
    const resolved = result instanceof Promise ? await result : result;
    expect(resolved.rows.length).toBe(1);
    expect((resolved.rows[0] as any)['?c.title']).toBe('GCal Connection');
    expect((resolved.rows[0] as any)['?c.connectionStatus']).toBe('connected');
    expect((resolved.rows[0] as any)['?c.lastSyncAt']).toBe('2026-02-18T00:00:00Z');

    kernel.close();
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

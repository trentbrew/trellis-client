/**
 * JSONL Kernel Backend
 *
 * Portable, append-only JSON Lines backend using Node `fs` APIs.
 * Each operation is stored as a single JSON line in the op log file.
 * Snapshots are stored as a sibling `.snapshot.json` file.
 */

import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, resolve } from 'path';
import type { KernelBackend, KernelOp } from './backend.js';

export type JsonlKernelBackendOptions = {
  filename: string;
};

export class JsonlKernelBackend implements KernelBackend {
  private filename: string;
  private snapshotPath: string;

  constructor(private opts: JsonlKernelBackendOptions) {
    this.filename = opts.filename;
    this.snapshotPath = opts.filename.replace(/\.jsonl$/, '.snapshot.json');
  }

  init(): void {
    const dir = dirname(this.filename);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.filename)) {
      writeFileSync(this.filename, '', 'utf-8');
    }
  }

  append(op: KernelOp): void {
    appendFileSync(this.filename, JSON.stringify(op) + '\n', 'utf-8');
  }

  readAll(): KernelOp[] {
    if (!existsSync(this.filename)) return [];
    const content = readFileSync(this.filename, 'utf-8').trim();
    if (!content) return [];
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as KernelOp);
  }

  readUntil(hash: string): KernelOp[] {
    const ops = this.readAll();
    const idx = ops.findIndex((op) => op.hash === hash);
    if (idx === -1) throw new Error(`Operation with hash ${hash} not found`);
    return ops.slice(0, idx + 1);
  }

  readAfter(hash: string): KernelOp[] {
    const ops = this.readAll();
    const idx = ops.findIndex((op) => op.hash === hash);
    if (idx === -1) throw new Error(`Operation with hash ${hash} not found`);
    return ops.slice(idx + 1);
  }

  readUntilTimestamp(isoTimestamp: string): KernelOp[] {
    const ts = new Date(isoTimestamp).getTime();
    const ops = this.readAll();
    return ops.filter((op) => new Date(op.timestamp).getTime() <= ts);
  }

  getLastOp(): KernelOp | undefined {
    const ops = this.readAll();
    return ops.length > 0 ? ops[ops.length - 1] : undefined;
  }

  countOpsAfter(hash?: string): number {
    // JSONL has no index, so we scan. Still O(n) without parsing payloads
    // fully — we just need line counts. Cheap enough for the dev workflow
    // this backend targets (small workspaces / test fixtures).
    if (!existsSync(this.filename)) return 0;
    const content = readFileSync(this.filename, 'utf-8').trim();
    if (!content) return 0;
    const lines = content.split('\n').filter(Boolean);
    if (!hash) return lines.length;
    const idx = lines.findIndex((line) => line.includes(`"hash":"${hash}"`));
    if (idx === -1) return 0;
    return lines.length - (idx + 1);
  }

  saveSnapshot(lastOpHash: string, data: any): void {
    const snapshot = { lastOpHash, data, timestamp: new Date().toISOString() };
    writeFileSync(
      this.snapshotPath,
      JSON.stringify(snapshot, null, 2),
      'utf-8',
    );
  }

  loadLatestSnapshot(): { lastOpHash: string; data: any } | undefined {
    if (!existsSync(this.snapshotPath)) return undefined;
    try {
      const raw = readFileSync(this.snapshotPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { lastOpHash: parsed.lastOpHash, data: parsed.data };
    } catch {
      return undefined;
    }
  }

  close(): void {
    // No-op for file-based backend
  }
}

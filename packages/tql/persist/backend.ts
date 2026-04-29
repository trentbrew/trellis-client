import type { Fact, Link } from '../store/eav-store.js';

export type KernelOpKind =
  | 'addFacts'
  | 'addLinks'
  | 'deleteFacts'
  | 'deleteLinks';

export interface KernelOp {
  /**
   * Content hash of this operation (including previousHash).
   * Format: trellis:op:{hash}
   */
  hash: string;

  /**
   * Kind of operation.
   */
  kind: KernelOpKind;

  /**
   * ISO timestamp of when the op was created.
   */
  timestamp: string;

  /**
   * The ID of the agent that performed the operation.
   */
  agentId: string;

  /**
   * Hash of the previous operation in the local chain.
   */
  previousHash?: string;

  /**
   * The actual data payload.
   */
  facts?: Fact[];
  links?: Link[];
}

export interface KernelBackend {
  init(): void;
  append(op: KernelOp): void;
  readAll(): KernelOp[];
  readUntil(hash: string): KernelOp[];
  readAfter(hash: string): KernelOp[];
  readUntilTimestamp(isoTimestamp: string): KernelOp[];
  getLastOp(): KernelOp | undefined;

  /**
   * Cheap count of ops after `hash` (or all ops if `hash` is undefined).
   * Must NOT parse op payloads — used to decide whether to auto-checkpoint
   * on boot without paying the full replay cost twice.
   * Optional so older/in-memory backends remain compatible; callers must
   * feature-detect.
   */
  countOpsAfter?(hash?: string): number;

  // Snapshot support
  saveSnapshot(lastOpHash: string, data: any): void;
  loadLatestSnapshot(): { lastOpHash: string; data: any } | undefined;

  close?(): void;
}

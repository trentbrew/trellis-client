/**
 * npm-schema SQLite backend (trellis@3.2.3 compatible).
 *
 * Mirrors `BetterSqliteKernelBackend` from trellis/core without importing the
 * published bundle — its esbuild `__require` shim fails under native ESM.
 */
import Database from 'better-sqlite3'
import type { KernelOp } from '@turtle.tech/trellis-kernel/persist'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS ops (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  previous_hash TEXT,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_op_hash TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,
  content BLOB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ops_kind ON ops(kind);
CREATE INDEX IF NOT EXISTS idx_ops_timestamp ON ops(timestamp);
CREATE INDEX IF NOT EXISTS idx_ops_agent ON ops(agent_id);
CREATE INDEX IF NOT EXISTS idx_ops_previous ON ops(previous_hash);
CREATE INDEX IF NOT EXISTS idx_snapshots_op ON snapshots(last_op_hash);
`

type OpRow = {
  hash: string
  kind: string
  timestamp: string
  agent_id: string
  previous_hash: string | null
  payload: string
}

type SnapshotRow = {
  last_op_hash: string
  data: string
}

type Stmts = {
  insert: Database.Statement
  readAll: Database.Statement
  readUntil: Database.Statement
  readAfter: Database.Statement
  getByHash: Database.Statement
  getLast: Database.Statement
  count: Database.Statement
  saveSnapshot: Database.Statement
  loadLatestSnapshot: Database.Statement
}

/** trellis@3.2.3 BetterSqliteKernelBackend — native better-sqlite3, ESM-safe. */
export class NpmBetterSqliteKernelBackend {
  private db: Database.Database
  private _stmts!: Stmts
  private _initialized = false

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
  }

  private _prepareStatements(): void {
    const db = this.db
    this._stmts = {
      insert: db.prepare(
        'INSERT OR REPLACE INTO ops (hash, kind, timestamp, agent_id, previous_hash, payload) VALUES (?, ?, ?, ?, ?, ?)',
      ),
      readAll: db.prepare('SELECT * FROM ops ORDER BY timestamp ASC'),
      readUntil: db.prepare(
        'SELECT * FROM ops WHERE rowid <= (SELECT rowid FROM ops WHERE hash = ?) ORDER BY rowid ASC',
      ),
      readAfter: db.prepare(
        'SELECT * FROM ops WHERE rowid > (SELECT rowid FROM ops WHERE hash = ?) ORDER BY rowid ASC',
      ),
      getByHash: db.prepare('SELECT * FROM ops WHERE hash = ?'),
      getLast: db.prepare('SELECT * FROM ops ORDER BY timestamp DESC LIMIT 1'),
      count: db.prepare('SELECT COUNT(*) as count FROM ops'),
      saveSnapshot: db.prepare(
        'INSERT INTO snapshots (last_op_hash, data, created_at) VALUES (?, ?, ?)',
      ),
      loadLatestSnapshot: db.prepare(
        'SELECT * FROM snapshots ORDER BY id DESC LIMIT 1',
      ),
    }
  }

  init(): void {
    if (this._initialized) return
    this.db.exec(SCHEMA_SQL)
    this._prepareStatements()
    this._initialized = true
  }

  append(op: KernelOp): void {
    const payload = JSON.stringify({
      facts: op.facts,
      links: op.links,
    })
    this._stmts.insert.run(
      op.hash,
      op.kind,
      op.timestamp,
      op.agentId,
      op.previousHash ?? null,
      payload,
    )
  }

  readAll(): KernelOp[] {
    const rows = this._stmts.readAll.all() as OpRow[]
    return rows.map((row) => this._rowToOp(row))
  }

  readUntil(opHash: string): KernelOp[] {
    const row = this._stmts.getByHash.get(opHash)
    if (!row) return []
    const rows = this._stmts.readUntil.all(opHash) as OpRow[]
    return rows.map((r) => this._rowToOp(r))
  }

  readUntilTimestamp(isoTimestamp: string): KernelOp[] {
    const rows = this.db
      .prepare('SELECT * FROM ops WHERE timestamp <= ? ORDER BY timestamp ASC')
      .all(isoTimestamp) as OpRow[]
    return rows.map((row) => this._rowToOp(row))
  }

  readAfter(opHash: string): KernelOp[] {
    const row = this._stmts.getByHash.get(opHash)
    if (!row) return this.readAll()
    const rows = this._stmts.readAfter.all(opHash) as OpRow[]
    return rows.map((r) => this._rowToOp(r))
  }

  getOpByHash(hash: string): KernelOp | undefined {
    const row = this._stmts.getByHash.get(hash) as OpRow | undefined
    return row ? this._rowToOp(row) : undefined
  }

  getLastOp(): KernelOp | undefined {
    const row = this._stmts.getLast.get() as OpRow | undefined
    return row ? this._rowToOp(row) : undefined
  }

  getOpCount(): number {
    const row = this._stmts.count.get() as { count: number } | undefined
    return row?.count ?? 0
  }

  saveSnapshot(lastOpHash: string, data: unknown): void {
    this._stmts.saveSnapshot.run(
      lastOpHash,
      JSON.stringify(data),
      new Date().toISOString(),
    )
  }

  loadLatestSnapshot(): { lastOpHash: string; data: unknown } | undefined {
    const row = this._stmts.loadLatestSnapshot.get() as SnapshotRow | undefined
    if (!row) return undefined
    return {
      lastOpHash: row.last_op_hash,
      data: JSON.parse(row.data),
    }
  }

  close(): void {
    this.db.close()
  }

  private _rowToOp(row: OpRow): KernelOp {
    const payload = JSON.parse(row.payload) as {
      facts?: KernelOp['facts']
      links?: KernelOp['links']
    }
    return {
      hash: row.hash,
      kind: row.kind as KernelOp['kind'],
      timestamp: row.timestamp,
      agentId: row.agent_id,
      previousHash: row.previous_hash ?? undefined,
      facts: payload.facts,
      links: payload.links,
    }
  }
}

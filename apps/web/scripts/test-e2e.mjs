#!/usr/bin/env node
/**
 * Serialized Playwright runner for multi-agent dev.
 *
 * - Fail-fast when dev is down (unless PW_COLD=1)
 * - File lock at <repo>/.agent/playwright.lock (one runner at a time)
 * - Sets PW_AGENT=1 + PW_NO_WEBSERVER=1 for agent-safe playwright.config.ts
 *
 * Exit codes:
 *   1  — dev server not reachable
 *  75  — PLAYWRIGHT_BUSY (lock held past wait timeout)
 */

import { spawnSync } from 'node:child_process'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const REPO_ROOT = join(WEB_ROOT, '../..')
const LOCK_DIR = join(REPO_ROOT, '.agent')
const LOCK_FILE = join(LOCK_DIR, 'playwright.lock')

const DEFAULT_DEV_PORT = 1414
const parsedPort = Number.parseInt(process.env.TRELLIS_PORT || '', 10)
const DEV_PORT = Number.isFinite(parsedPort) ? parsedPort : DEFAULT_DEV_PORT

const LOCK_WAIT_MS = Number.parseInt(process.env.PW_LOCK_WAIT_MS || '', 10) || 10 * 60 * 1000
const LOCK_POLL_MS = 2_000
const STALE_LOCK_MS = 30 * 60 * 1000
const EXIT_BUSY = 75

const forceCold = process.env.PW_COLD === '1'
const playwrightArgs = process.argv.slice(2)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readLock() {
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
  } catch {
    return null
  }
}

function isStaleLock(lock) {
  if (!lock) return true
  if (!isProcessAlive(lock.pid)) return true
  if (Date.now() - lock.at > STALE_LOCK_MS) return true
  return false
}

function releaseLock() {
  try {
    const lock = readLock()
    if (lock?.pid === process.pid) unlinkSync(LOCK_FILE)
  } catch {
    // ignore
  }
}

function tryAcquireLock() {
  mkdirSync(LOCK_DIR, { recursive: true })

  const existing = readLock()
  if (existing && !isStaleLock(existing)) return false

  if (existing && isStaleLock(existing)) {
    try {
      unlinkSync(LOCK_FILE)
    } catch {
      // ignore
    }
  }

  try {
    const fd = openSync(LOCK_FILE, 'wx')
    const payload = JSON.stringify({
      pid: process.pid,
      at: Date.now(),
      agent: process.env.TRELLIS_AGENT_ID || process.env.CURSOR_AGENT || 'unknown',
      cwd: WEB_ROOT,
      args: playwrightArgs,
    })
    writeSync(fd, payload)
    closeSync(fd)
    return true
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'EEXIST') {
      return false
    }
    throw err
  }
}

async function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS
  while (Date.now() < deadline) {
    if (tryAcquireLock()) return true
    const holder = readLock()
    const who = holder?.agent ?? holder?.pid ?? 'another agent'
    process.stderr.write(`[test-e2e] waiting for Playwright lock (held by ${who})…\n`)
    await sleep(LOCK_POLL_MS)
  }
  return false
}

async function devHealthy() {
  const url = `http://localhost:${DEV_PORT}/api/graph/health`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3_000) })
    return res.ok
  } catch {
    return false
  }
}

function runPlaywright() {
  const cli = join(WEB_ROOT, 'node_modules/@playwright/test/cli.js')
  const env = {
    ...process.env,
    PW_AGENT: '1',
  }

  if (!forceCold) {
    env.PW_NO_WEBSERVER = '1'
  }

  const result = spawnSync(process.execPath, [cli, 'test', ...playwrightArgs], {
    cwd: WEB_ROOT,
    env,
    stdio: 'inherit',
  })

  return result.status ?? 1
}

async function main() {
  if (!forceCold) {
    const healthy = await devHealthy()
    if (!healthy) {
      process.stderr.write(
        `[test-e2e] Dev server not reachable at http://localhost:${DEV_PORT}/api/graph/health\n` +
          `[test-e2e] Start once: just run (or jr). For cold-start: PW_COLD=1 pnpm test:e2e\n`,
      )
      process.exit(1)
    }
  }

  const acquired = await acquireLock()
  if (!acquired) {
    const holder = readLock()
    process.stderr.write(
      `[test-e2e] PLAYWRIGHT_BUSY — lock held by ${holder?.agent ?? holder?.pid ?? 'unknown'} ` +
        `(waited ${Math.round(LOCK_WAIT_MS / 1000)}s). Retry or scope to one QA tab.\n`,
    )
    process.exit(EXIT_BUSY)
  }

  process.on('SIGINT', () => {
    releaseLock()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    releaseLock()
    process.exit(143)
  })

  let exitCode = 1
  try {
    exitCode = runPlaywright()
  } finally {
    releaseLock()
  }

  process.exit(exitCode)
}

main().catch((err) => {
  releaseLock()
  console.error('[test-e2e] fatal:', err)
  process.exit(1)
})

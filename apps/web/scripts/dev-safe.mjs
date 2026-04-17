#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const MAX_RECOVERY_ATTEMPTS = 3
const RECOVERABLE_PATTERNS = [
  '.nuxt/dev/index.mjs',
  'Cannot find module',
  'ERR_MODULE_NOT_FOUND',
]

let shuttingDown = false
let activeChild = null

function log(message) {
  console.log(`[dev-safe] ${message}`)
}

function isRecoverableNuxtError(output) {
  const haystack = output.toLowerCase()
  return RECOVERABLE_PATTERNS.every((pattern) => haystack.includes(pattern.toLowerCase()))
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function runCommand(bin, args, options = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(bin, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
      ...options,
    })

    let output = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stderr.write(text)
    })

    child.on('close', (code, signal) => {
      resolvePromise({ code: code ?? 0, signal: signal ?? null, output })
    })
  })
}

async function ensurePrepared() {
  const indexPath = resolve('.nuxt/dev/index.mjs')
  if (await fileExists(indexPath)) return

  log('Missing .nuxt/dev/index.mjs, running nuxi prepare...')
  const result = await runCommand('pnpm', ['exec', 'nuxi', 'prepare'])
  if (result.code !== 0) {
    throw new Error('nuxi prepare failed while trying to restore .nuxt/dev artifacts')
  }
}

async function runDevProcess() {
  return await new Promise((resolvePromise) => {
    const args = ['exec', 'nuxi', 'dev', ...process.argv.slice(2)]
    const child = spawn('pnpm', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    })

    activeChild = child
    let output = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      output += text
      process.stderr.write(text)
    })

    child.on('close', (code, signal) => {
      activeChild = null
      resolvePromise({ code: code ?? 0, signal: signal ?? null, output })
    })
  })
}

function attachSignalHandlers() {
  const forward = (signal) => {
    shuttingDown = true
    if (activeChild && !activeChild.killed) {
      activeChild.kill(signal)
      return
    }
    process.exit(0)
  }

  process.on('SIGINT', () => forward('SIGINT'))
  process.on('SIGTERM', () => forward('SIGTERM'))
}

async function main() {
  attachSignalHandlers()

  let recoveryAttempts = 0

  while (true) {
    await ensurePrepared()

    const result = await runDevProcess()

    if (shuttingDown) {
      process.exit(result.code)
    }

    if (result.code === 0) {
      process.exit(0)
    }

    const shouldRecover = isRecoverableNuxtError(result.output)

    if (!shouldRecover || recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      process.exit(result.code)
    }

    recoveryAttempts += 1
    log(
      `Recovered missing Nuxt dev artifact (${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}). Re-preparing and restarting...`,
    )

    const prepareResult = await runCommand('pnpm', ['exec', 'nuxi', 'prepare'])
    if (prepareResult.code !== 0) {
      process.exit(prepareResult.code)
    }
  }
}

main().catch((error) => {
  console.error('[dev-safe] Fatal error:', error)
  process.exit(1)
})

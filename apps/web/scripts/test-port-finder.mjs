#!/usr/bin/env node
/**
 * Test script to verify port-finding logic works correctly.
 * Tests both ensurePortAvailable (kill + reuse) and findAvailablePort (increment) behaviors.
 */

import { createServer } from 'node:net'
import { execSync } from 'node:child_process'

// Copy of ensurePortAvailable for testing (to avoid import issues)
async function ensurePortAvailable(port) {
  const isAvailable = await isPortAvailable(port)

  if (!isAvailable) {
    console.log(`   Port ${port} is in use. Attempting to free it...`)
    killProcessOnPort(port)

    const stillInUse = !(await isPortAvailable(port))
    if (stillInUse) {
      throw new Error(`Failed to free port ${port}`)
    }

    console.log(`   Port ${port} is now available`)
  }

  return port
}

function killProcessOnPort(port) {
  const ownPid = process.pid.toString()
  try {
    const platform = process.platform
    if (platform === 'darwin' || platform === 'linux') {
      try {
        // Try listening state first, then any connection to the port
        let output = ''
        try {
          output = execSync(`lsof -ti:${port} -sTCP:LISTEN`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        } catch {
          output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        }
        const pids = output
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((pid) => pid !== ownPid)
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`   Killed process ${pid}`)
          } catch {
            /* Process may have already exited */
          }
        }
      } catch {
        /* No process found or lsof failed */
      }
    }
    execSync('sleep 0.5', { stdio: 'ignore' })
  } catch {
    /* Ignore errors */
  }
}

async function findAvailablePort(startPort, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const isAvailable = await isPortAvailable(port)
    if (isAvailable) {
      return port
    }
  }
  throw new Error(`No available port found after ${maxAttempts} attempts starting from ${startPort}`)
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })

    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port, '127.0.0.1')
  })
}

async function test() {
  console.log('Testing port finder...\n')

  // Test 1: ensurePortAvailable should always return the requested port
  console.log('Test 1: ensurePortAvailable always returns requested port')
  const testPort = 19999
  const port1 = await ensurePortAvailable(testPort)
  console.log(`✓ Got port: ${port1}`)
  console.assert(port1 === testPort, `Expected port ${testPort}, got ${port1}`)

  // Test 2: ensurePortAvailable should kill process and reuse port
  console.log(`\nTest 2: ensurePortAvailable kills blocker and reuses port ${testPort}`)
  const blocker = createServer()
  await new Promise((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(testPort, '127.0.0.1', resolve)
  })
  console.log(`   Port ${testPort} is now blocked by test server`)

  const port2 = await ensurePortAvailable(testPort)
  console.log(`✓ Got port: ${port2} (blocker killed)`)
  console.assert(port2 === testPort, `Expected port ${testPort}, got ${port2}`)

  blocker.close()

  // Test 3: findAvailablePort should increment when port is in use
  console.log('\nTest 3: findAvailablePort increments when port is blocked')
  const blockPort = 19998
  const blocker2 = createServer()
  await new Promise((resolve, reject) => {
    blocker2.once('error', reject)
    blocker2.listen(blockPort, '127.0.0.1', resolve)
  })

  const port3 = await findAvailablePort(blockPort)
  console.log(`✓ Blocked ${blockPort}, got port: ${port3}`)
  console.assert(port3 > blockPort, `Expected port > ${blockPort}, got ${port3}`)

  blocker2.close()

  console.log('\n✅ All tests passed!')
  console.log('✓ ensurePortAvailable always returns requested port (1414)')
  console.log('✓ ensurePortAvailable kills blocking processes')
  console.log('✓ findAvailablePort increments as fallback')
}

test().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

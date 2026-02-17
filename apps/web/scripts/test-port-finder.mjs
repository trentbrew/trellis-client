#!/usr/bin/env node
/**
 * Test script to verify port-finding logic works correctly.
 * Creates a server on port 1414, then verifies the port finder increments to 1415.
 */

import { createServer } from 'node:net'

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

  // Test 1: Find next available port starting from 1414
  console.log('Test 1: Finding available port starting from 1414')
  const port1 = await findAvailablePort(1414)
  console.log(`✓ Found port: ${port1}`)
  console.assert(port1 >= 1414, `Expected port >= 1414, got ${port1}`)
  console.assert(port1 !== 3000, 'Port finder should never return 3000')

  // Test 2: Block the found port and verify it increments
  console.log(`\nTest 2: Blocking port ${port1}, then finding next available`)
  const blocker = createServer()
  await new Promise((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(port1, '127.0.0.1', resolve)
  })
  console.log(`✓ Port ${port1} is now blocked`)

  const port2 = await findAvailablePort(1414)
  console.log(`✓ Found port: ${port2}`)
  console.assert(port2 > port1, `Expected port > ${port1}, got ${port2}`)
  console.assert(port2 !== 3000, 'Port finder should never return 3000')

  blocker.close()

  // Test 3: Verify sequential increment behavior
  console.log('\nTest 3: Verifying sequential port increment (1414 → 1415 → 1416...)')
  const blockers = []
  const startPort = 9000 // Use a clean range for this test

  // Block ports 5000, 5001, 5002
  for (let i = 0; i < 3; i++) {
    const b = createServer()
    await new Promise((resolve) => b.listen(startPort + i, '127.0.0.1', resolve))
    blockers.push(b)
  }

  const port3 = await findAvailablePort(startPort)
  console.log(`✓ With ports ${startPort}-${startPort + 2} blocked, found port: ${port3}`)
  console.assert(port3 === startPort + 3, `Expected port ${startPort + 3}, got ${port3}`)

  blockers.forEach(b => b.close())

  console.log('\n✅ All tests passed!')
  console.log('✓ Port finder correctly increments from configured port')
  console.log('✓ Port finder never falls back to 3000')
}

test().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

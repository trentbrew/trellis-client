/**
 * E2E smoke test for trellis-cli against a running dev server.
 *
 * Run: node packages/trellis-cli/test/e2e.mjs
 * Requires: dev server on http://localhost:4141
 */

import { TrellisClient } from '../src/client.mjs'

const client = new TrellisClient({ agentId: 'e2e-test' })
const TEST_ID = 'calendaritem:e2e-test-' + Date.now()
let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

async function run() {
  console.log('E2E: trellis-cli smoke test\n')

  // Health
  console.log('1. Health check')
  const health = await client.health()
  assert('status is ok', health.status === 'ok')
  assert('factCount > 0', health.factCount > 0)

  // Create
  console.log('\n2. Create node')
  const created = await client.createNode(TEST_ID, 'calendaritem', {
    type: 'task',
    title: 'E2E test task',
    taskStatus: 'pending',
    startDate: '2026-02-11',
    allDay: true,
    priority: 'low',
    category: 'test',
  })
  assert('create returns ok', created.ok === true)
  assert('create returns entityId', created.entityId === TEST_ID)

  // Read
  console.log('\n3. Read node')
  const read = await client.getNode(TEST_ID)
  assert('title matches', read.node.title === 'E2E test task')
  assert('type is task', read.node['@type'] === 'task')
  assert('priority is low', read.node.priority === 'low')

  // Update
  console.log('\n4. Update node')
  const updated = await client.updateNode(TEST_ID, 'calendaritem', {
    type: 'task',
    title: 'E2E updated task',
    taskStatus: 'in-progress',
    startDate: '2026-02-11',
    allDay: true,
    priority: 'high',
    category: 'test',
  })
  assert('update returns ok', updated.ok === true)
  const read2 = await client.getNode(TEST_ID)
  assert('title updated', read2.node.title === 'E2E updated task')
  assert('priority updated', read2.node.priority === 'high')

  // Query
  console.log('\n5. Query')
  const query = await client.query('FIND calendaritem AS ?e WHERE ?e.type = "task"')
  const ids = query.data.map((r) => r['?e'])
  assert('query returns data', query.data.length > 0)
  assert('test node in results', ids.includes(TEST_ID))

  // Schema
  console.log('\n6. Schema')
  const schema = await client.ontologies()
  assert('has calendaritem schema', 'trellis:schema/calendaritem' in schema)

  // Delete
  console.log('\n7. Delete node')
  const deleted = await client.deleteNode(TEST_ID)
  assert('delete returns ok', deleted.ok === true)

  // Verify gone
  try {
    await client.getNode(TEST_ID)
    assert('node gone after delete', false)
  } catch {
    assert('node gone after delete', true)
  }

  // Summary
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('E2E FATAL:', err.message)
  process.exit(1)
})

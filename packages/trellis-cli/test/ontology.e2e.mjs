/**
 * E2E tests for trellis-cli ontology commands.
 * Covers: create, get, update (with UI metadata flags), add-field, remove-field, delete.
 *
 * Run: node packages/trellis-cli/test/ontology.e2e.mjs
 * Requires: dev server on http://localhost:$TRELLIS_PORT
 */

import { TrellisClient } from '../src/client.mjs'

const client = new TrellisClient({ agentId: 'e2e-ontology-test' })
const SCHEMA_ID = `trellis:schema/e2e-test-${Date.now()}`
let passed = 0
let failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function run() {
  console.log('E2E: trellis-cli ontology commands\n')

  // ── 1. Create with full UI metadata ────────────────────────────────
  console.log('1. Create ontology with UI metadata')
  const created = await client.createOntology({
    '@id': SCHEMA_ID,
    '@type': 'trellis:Schema',
    version: '1.0.0',
    tier: 'user',
    entityClass: 'container',
    label: 'Show',
    labelPlural: 'Shows',
    icon: 'lucide:tv',
    color: 'purple',
    defaultSortField: 'title',
    fields: [
      { name: 'title', valueType: 'title', required: true },
      { name: 'description', valueType: 'rich_text' },
      { name: 'status', valueType: 'status', selectOptions: [{ name: 'In Production' }, { name: 'Airing' }, { name: 'Cancelled' }] },
    ],
  })
  assert('create returns ok', created.ok === true)
  assert('create returns schema id', created.id === SCHEMA_ID)

  // ── 2. Get and verify all fields ───────────────────────────────────
  console.log('\n2. Get ontology and verify UI metadata')
  const fetched = await client.getOntology(SCHEMA_ID)
  assert('tier is user', fetched.tier === 'user')
  assert('entityClass is container', fetched.entityClass === 'container')
  assert('label is Show', fetched.label === 'Show')
  assert('labelPlural is Shows', fetched.labelPlural === 'Shows')
  assert('icon is lucide:tv', fetched.icon === 'lucide:tv')
  assert('color is purple', fetched.color === 'purple')
  assert('defaultSortField is title', fetched.defaultSortField === 'title')
  assert('has 3 fields', fetched.fields?.length === 3)
  assert('first field is title type', fetched.fields?.[0]?.valueType === 'title')

  // ── 3. Update UI metadata (icon, color, labelPlural) ───────────────
  console.log('\n3. Update ontology UI metadata')
  const updated = await client.updateOntology(SCHEMA_ID, {
    ...fetched,
    icon: 'lucide:clapperboard',
    color: 'violet',
    labelPlural: 'TV Shows',
    version: '1.1.0',
  })
  assert('update returns ok', updated.ok === true)

  const fetched2 = await client.getOntology(SCHEMA_ID)
  assert('icon updated', fetched2.icon === 'lucide:clapperboard')
  assert('color updated', fetched2.color === 'violet')
  assert('labelPlural updated', fetched2.labelPlural === 'TV Shows')
  assert('version bumped', fetched2.version === '1.1.0')
  assert('fields preserved after update', fetched2.fields?.length === 3)

  // ── 4. Add a field ─────────────────────────────────────────────────
  console.log('\n4. Add field to ontology')
  const afterAdd = await client.addOntologyField(SCHEMA_ID, {
    name: 'airDate',
    valueType: 'date',
  })
  assert('add-field returns ok', afterAdd.ok === true)

  const fetched3 = await client.getOntology(SCHEMA_ID)
  assert('field count is now 4', fetched3.fields?.length === 4)
  assert('new field exists', fetched3.fields?.some((f) => f.name === 'airDate'))
  assert('new field has correct valueType', fetched3.fields?.find((f) => f.name === 'airDate')?.valueType === 'date')

  // ── 5. Duplicate field is rejected ────────────────────────────────
  console.log('\n5. Duplicate field rejection')
  try {
    await client.addOntologyField(SCHEMA_ID, { name: 'airDate', valueType: 'date' })
    // If we reach here the server allowed a duplicate — that's a failure
    assert('duplicate field rejected', false, 'server accepted duplicate field name')
  } catch {
    assert('duplicate field rejected', true)
  }

  // ── 6. Remove a field ──────────────────────────────────────────────
  console.log('\n6. Remove field from ontology')
  const afterRemove = await client.removeOntologyField(SCHEMA_ID, 'airDate')
  assert('remove-field returns ok', afterRemove.ok === true)

  const fetched4 = await client.getOntology(SCHEMA_ID)
  assert('field count back to 3', fetched4.fields?.length === 3)
  assert('removed field gone', !fetched4.fields?.some((f) => f.name === 'airDate'))

  // ── 7. List includes our schema ────────────────────────────────────
  console.log('\n7. List ontologies')
  const all = await client.ontologies()
  assert('list includes new schema', SCHEMA_ID in all, `keys: ${Object.keys(all).slice(0, 5).join(', ')}`)

  // ── 8. Delete ──────────────────────────────────────────────────────
  console.log('\n8. Delete ontology')
  const deleted = await client.deleteOntology(SCHEMA_ID)
  assert('delete returns ok', deleted.ok === true)

  // ── 9. Verify gone ─────────────────────────────────────────────────
  console.log('\n9. Verify deleted ontology is gone')
  try {
    await client.getOntology(SCHEMA_ID)
    assert('schema gone after delete', false, 'schema still accessible after delete')
  } catch {
    assert('schema gone after delete', true)
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('E2E FATAL:', err.message)
  process.exit(1)
})

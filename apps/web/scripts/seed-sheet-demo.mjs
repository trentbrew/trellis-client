#!/usr/bin/env bun
/**
 * Seed Q3 runway sheet demo entities via graph mutate API.
 * Usage:
 *   bun apps/web/scripts/seed-sheet-demo.mjs
 *   bun apps/web/scripts/seed-sheet-demo.mjs --bulk 60
 */
import {
  SHEET_Q3_RUNWAY_ID,
  Q3_RUNWAY_COLUMNS,
  Q3_RUNWAY_QUERY,
  Q3_RUNWAY_EXPENSES,
  DEMO_PERSON_REBECCA,
} from '../app/lib/sheet-demo.ts'

const PORT = process.env.TRELLIS_PORT || '1414'
const BASE = `http://localhost:${PORT}/api/graph`

function parseBulkCount(argv) {
  const flagIdx = argv.indexOf('--bulk')
  if (flagIdx < 0) return 0
  const next = argv[flagIdx + 1]
  if (next && !next.startsWith('-')) return Math.max(0, parseInt(next, 10) || 0)
  return 60
}

function bulkExpenses(count) {
  const rows = []
  for (let n = 1; n <= count; n++) {
    rows.push({
      id: `entity:expense-bulk-${n}`,
      title: `Synthetic vendor ${n}`,
      category: n % 3 === 0 ? 'Travel' : n % 2 === 0 ? 'Tools' : 'Infra',
      budgeted: 100 + n * 10,
      spent: 50 + n * 8,
      quarter: 'Q3-2026',
    })
  }
  return rows
}

async function mutate(body) {
  const res = await fetch(`${BASE}/mutate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, agentId: 'seed-script' }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`mutate failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function upsertExpense(exp) {
  const { id, ...data } = exp
  await mutate({
    action: 'createNode',
    entityId: id,
    type: 'entity',
    data: { type: 'expense', ...data },
  }).catch(() =>
    mutate({
      action: 'updateNode',
      entityId: id,
      type: 'entity',
      data: { type: 'expense', ...data },
    }),
  )
}

async function main() {
  const bulkCount = parseBulkCount(process.argv)
  console.log('Seeding sheet demo…')

  await mutate({
    action: 'createNode',
    entityId: SHEET_Q3_RUNWAY_ID,
    type: 'entity',
    data: {
      type: 'sheet',
      title: 'Q3 Runway',
      query: Q3_RUNWAY_QUERY,
      columns: Q3_RUNWAY_COLUMNS,
      zoneId: 'entity:founder-facility-workshop',
      facilityId: 'entity:founder-facility',
    },
  }).catch(() => {
    console.log('Sheet entity may already exist — updating')
    return mutate({
      action: 'updateNode',
      entityId: SHEET_Q3_RUNWAY_ID,
      type: 'entity',
      data: {
        type: 'sheet',
        title: 'Q3 Runway',
        query: Q3_RUNWAY_QUERY,
        columns: Q3_RUNWAY_COLUMNS,
      },
    })
  })

  for (const exp of Q3_RUNWAY_EXPENSES) {
    await upsertExpense(exp)
  }

  await mutate({
    action: 'createNode',
    entityId: DEMO_PERSON_REBECCA,
    type: 'entity',
    data: { type: 'person', title: 'Rebecca Smith' },
  }).catch(() =>
    mutate({
      action: 'updateNode',
      entityId: DEMO_PERSON_REBECCA,
      type: 'entity',
      data: { type: 'person', title: 'Rebecca Smith' },
    }),
  )

  if (bulkCount > 0) {
    console.log(`Seeding ${bulkCount} bulk expense rows…`)
    for (const exp of bulkExpenses(bulkCount)) {
      await upsertExpense(exp)
    }
  }

  const totalRows = Q3_RUNWAY_EXPENSES.length + bulkCount
  console.log(`✓ Sheet: ${SHEET_Q3_RUNWAY_ID}`)
  console.log(`✓ ${totalRows} expense rows (${Q3_RUNWAY_EXPENSES.length} demo${bulkCount ? ` + ${bulkCount} bulk` : ''})`)
  console.log(`Open: http://localhost:${PORT}/sheets/q3-runway`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

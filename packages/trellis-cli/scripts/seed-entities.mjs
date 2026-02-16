/**
 * Seed people, files, and projects into the TQL graph via the trellis CLI client.
 *
 * Agent-driven data entry: entities created here appear in the browser UI
 * immediately via SSE. Cross-references connect them to existing tasks,
 * events, and notes for a richly connected graph.
 *
 * Run: node packages/trellis-cli/scripts/seed-entities.mjs
 * Requires: dev server on http://localhost:4141
 */

import { TrellisClient } from '../src/client.mjs'

const client = new TrellisClient({ agentId: 'cascade' })

const today = new Date().toISOString().split('T')[0]

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ============================================================================
// People (actor class)
// ============================================================================

const people = [
  {
    id: 'entity:person-1',
    data: {
      type: 'person',
      title: 'Alex Chen',
      description: 'Senior frontend engineer on the product team. Handles React/Vue components, state management, and code reviews.',
      startDate: daysFromNow(-90),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['team', 'engineering', 'frontend'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p1-t12', entityId: 'task-12', entityType: 'task', title: 'Sprint 14 — API refactor', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p1-t14', entityId: 'task-14', entityType: 'task', title: 'Review PR #482 — pagination fix', direction: 'outgoing' },
      ],
      email: 'alex.chen@turtlelabs.dev',
      phone: '+1 (555) 234-5678',
      avatar: '',
      entityRole: 'engineer',
      relationships: ['person-3', 'person-4'],
      organization: 'Turtle Labs LLC',
      jobTitle: 'Senior Frontend Engineer',
    },
  },
  {
    id: 'entity:person-2',
    data: {
      type: 'person',
      title: 'Maya Rodriguez',
      description: 'Design lead responsible for the component library, design systems, and product design direction.',
      startDate: daysFromNow(-120),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['team', 'design', 'leadership'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p2-e2', entityId: 'event-2', entityType: 'event', title: 'Design review — new dashboard', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p2-t16', entityId: 'task-16', entityType: 'task', title: 'Prep slide deck for investor update', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p2-e4', entityId: 'event-4', entityType: 'event', title: 'Design systems workshop', direction: 'outgoing' },
      ],
      email: 'maya.rodriguez@turtlelabs.dev',
      phone: '+1 (555) 345-6789',
      avatar: '',
      entityRole: 'designer',
      relationships: ['person-1', 'person-4'],
      organization: 'Turtle Labs LLC',
      jobTitle: 'Design Lead',
    },
  },
  {
    id: 'entity:person-3',
    data: {
      type: 'person',
      title: 'Jordan Park',
      description: 'Backend engineer focused on API design, database optimization, and infrastructure.',
      startDate: daysFromNow(-60),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['team', 'engineering', 'backend'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p3-e1', entityId: 'event-1', entityType: 'event', title: 'Team standup', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p3-e7', entityId: 'event-7', entityType: 'event', title: 'Sprint retrospective', direction: 'outgoing' },
      ],
      email: 'jordan.park@turtlelabs.dev',
      phone: '+1 (555) 456-7890',
      avatar: '',
      entityRole: 'engineer',
      relationships: ['person-1', 'person-4'],
      organization: 'Turtle Labs LLC',
      jobTitle: 'Backend Engineer',
    },
  },
  {
    id: 'entity:person-4',
    data: {
      type: 'person',
      title: 'Eli Torres',
      description: 'DevOps engineer managing CI/CD pipelines, cloud infrastructure, and deployment automation.',
      startDate: daysFromNow(-45),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['team', 'engineering', 'devops'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p4-t18', entityId: 'task-18', entityType: 'task', title: 'Migrate CI to GitHub Actions', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p4-e4', entityId: 'event-4', entityType: 'event', title: 'Design systems workshop', direction: 'outgoing' },
      ],
      email: 'eli.torres@turtlelabs.dev',
      phone: '+1 (555) 567-8901',
      avatar: '',
      entityRole: 'engineer',
      relationships: ['person-1', 'person-3'],
      organization: 'Turtle Labs LLC',
      jobTitle: 'DevOps Engineer',
    },
  },
  {
    id: 'entity:person-5',
    data: {
      type: 'person',
      title: 'Sam Liu',
      description: 'Close friend — coffee buddy, board game enthusiast, and fellow tech nerd.',
      startDate: daysFromNow(-365),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['friend', 'social'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p5-e8', entityId: 'event-8', entityType: 'event', title: 'Lunch with Sam', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p5-t8', entityId: 'task-8', entityType: 'task', title: 'Send birthday card to Sam', direction: 'outgoing' },
      ],
      email: 'sam.liu@gmail.com',
      phone: '+1 (555) 678-9012',
      avatar: '',
      entityRole: '',
      relationships: [],
      organization: '',
      jobTitle: 'Product Manager at Stripe',
    },
  },
  {
    id: 'entity:person-6',
    data: {
      type: 'person',
      title: 'Dr. Anita Patel',
      description: 'Primary care physician — annual physicals, general health consultations.',
      startDate: daysFromNow(-180),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'health',
      tags: ['healthcare', 'doctor'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p6-t9', entityId: 'task-9', entityType: 'task', title: 'Book annual physical', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-p6-e3', entityId: 'event-3', entityType: 'event', title: 'Dentist appointment', direction: 'outgoing' },
      ],
      email: 'office@patelprimarycare.com',
      phone: '+1 (555) 789-0123',
      avatar: '',
      entityRole: 'physician',
      relationships: [],
      organization: 'Patel Primary Care',
      jobTitle: 'Primary Care Physician',
    },
  },
  {
    id: 'entity:person-7',
    data: {
      type: 'person',
      title: 'Kenji Watanabe',
      description: 'External contractor — specializes in accessibility audits and WCAG compliance.',
      startDate: daysFromNow(-30),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['contractor', 'accessibility'],
      owner: 'you',
      involved: [],
      references: [],
      email: 'kenji@a11yworks.io',
      phone: '+1 (555) 890-1234',
      avatar: '',
      entityRole: 'contractor',
      relationships: [],
      organization: 'A11y Works',
      jobTitle: 'Accessibility Consultant',
    },
  },
  {
    id: 'entity:person-8',
    data: {
      type: 'person',
      title: 'Priya Sharma',
      description: 'Investor and advisor — partner at Sequoia Scout, early-stage focus on dev tools and infrastructure.',
      startDate: daysFromNow(-14),
      allDay: true,
      priority: 'high',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['investor', 'advisor'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-p8-t16', entityId: 'task-16', entityType: 'task', title: 'Prep slide deck for investor update', direction: 'outgoing' },
      ],
      email: 'priya@sequoiascout.com',
      phone: '',
      avatar: '',
      entityRole: 'advisor',
      relationships: [],
      organization: 'Sequoia Scout',
      jobTitle: 'Partner',
    },
  },
]

// ============================================================================
// Files (document class)
// ============================================================================

const files = [
  {
    id: 'entity:file-1',
    data: {
      type: 'file',
      title: 'Q1 Revenue Dashboard.pdf',
      description: 'Quarterly financial summary with revenue charts, expense breakdown, and runway projections.',
      startDate: daysFromNow(-5),
      allDay: true,
      priority: 'high',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['finance', 'quarterly', 'report'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-f1-t1', entityId: 'task-1', entityType: 'task', title: 'Finish quarterly review slides', direction: 'outgoing' },
      ],
      content: '',
      pinned: true,
      mimeType: 'application/pdf',
      sizeBytes: 2_450_000,
      fileUrl: '',
      storagePath: '/files/finance/Q1_Revenue_Dashboard.pdf',
    },
  },
  {
    id: 'entity:file-2',
    data: {
      type: 'file',
      title: 'January Receipts.xlsx',
      description: 'Consolidated expense receipts for January — ready for submission.',
      startDate: daysFromNow(-8),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['finance', 'expenses', 'receipts'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-f2-t3', entityId: 'task-3', entityType: 'task', title: 'Submit expense report', direction: 'outgoing' },
      ],
      content: '',
      pinned: false,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 384_000,
      fileUrl: '',
      storagePath: '/files/finance/January_Receipts.xlsx',
    },
  },
  {
    id: 'entity:file-3',
    data: {
      type: 'file',
      title: 'Brand Guidelines v2.1.pdf',
      description: 'Turtle Labs brand standards — logo usage, color palette, typography, and component patterns.',
      startDate: daysFromNow(-30),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['brand', 'design', 'guidelines'],
      owner: 'you',
      involved: ['maya'],
      references: [
        { kind: 'entity', id: 'ref-f3-p2', entityId: 'person-2', entityType: 'person', title: 'Maya Rodriguez', direction: 'outgoing' },
      ],
      content: '',
      pinned: true,
      mimeType: 'application/pdf',
      sizeBytes: 8_700_000,
      fileUrl: '',
      storagePath: '/files/design/Brand_Guidelines_v2.1.pdf',
    },
  },
  {
    id: 'entity:file-4',
    data: {
      type: 'file',
      title: 'Architecture Diagram.png',
      description: 'High-level system architecture — TQL kernel, instant-local adapter, entity registry, and data flow.',
      startDate: daysFromNow(-3),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['architecture', 'diagram', 'engineering'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-f4-t12', entityId: 'task-12', entityType: 'task', title: 'Sprint 14 — API refactor', direction: 'outgoing' },
      ],
      content: '',
      pinned: false,
      mimeType: 'image/png',
      sizeBytes: 1_200_000,
      fileUrl: '',
      storagePath: '/files/engineering/Architecture_Diagram.png',
    },
  },
  {
    id: 'entity:file-5',
    data: {
      type: 'file',
      title: 'Employee Handbook 2026.pdf',
      description: 'Company policies, benefits overview, PTO guidelines, and remote work policy.',
      startDate: daysFromNow(-60),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['hr', 'policy', 'handbook'],
      owner: 'you',
      involved: [],
      references: [],
      content: '',
      pinned: false,
      mimeType: 'application/pdf',
      sizeBytes: 4_500_000,
      fileUrl: '',
      storagePath: '/files/hr/Employee_Handbook_2026.pdf',
    },
  },
  {
    id: 'entity:file-6',
    data: {
      type: 'file',
      title: 'Trellis Entity Model.svg',
      description: 'ERD-style diagram of the two-axis entity class system — temporal, document, actor, container.',
      startDate: daysFromNow(-2),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['trellis', 'diagram', 'entity-system'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-f6-n5', entityId: 'note-5', entityType: 'note', title: 'Design tokens research', direction: 'outgoing' },
      ],
      content: '',
      pinned: true,
      mimeType: 'image/svg+xml',
      sizeBytes: 48_000,
      fileUrl: '',
      storagePath: '/files/engineering/Trellis_Entity_Model.svg',
    },
  },
  {
    id: 'entity:file-7',
    data: {
      type: 'file',
      title: 'Roadmap Planning Recording.mp4',
      description: 'Video recording of the Q1 roadmap planning session — 47 minutes.',
      startDate: daysFromNow(-1),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['recording', 'meeting', 'planning'],
      owner: 'you',
      involved: ['alex', 'maya'],
      references: [
        { kind: 'entity', id: 'ref-f7-n2', entityId: 'note-2', entityType: 'note', title: 'Meeting notes — roadmap planning', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-f7-e2', entityId: 'event-2', entityType: 'event', title: 'Design review — new dashboard', direction: 'outgoing' },
      ],
      content: '',
      pinned: false,
      mimeType: 'video/mp4',
      sizeBytes: 156_000_000,
      fileUrl: '',
      storagePath: '/files/recordings/Roadmap_Planning_Recording.mp4',
    },
  },
  {
    id: 'entity:file-8',
    data: {
      type: 'file',
      title: 'Invoice INV-2026-0042.pdf',
      description: 'Invoice from A11y Works for accessibility audit — Q1 engagement.',
      startDate: daysFromNow(-7),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['invoice', 'finance', 'contractor'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-f8-p7', entityId: 'person-7', entityType: 'person', title: 'Kenji Watanabe', direction: 'outgoing' },
      ],
      content: '',
      pinned: false,
      mimeType: 'application/pdf',
      sizeBytes: 180_000,
      fileUrl: '',
      storagePath: '/files/finance/Invoice_INV-2026-0042.pdf',
    },
  },
]

// ============================================================================
// Projects (container class)
// ============================================================================

const projects = [
  {
    id: 'entity:project-1',
    data: {
      type: 'project',
      title: 'Trellis Platform',
      description: 'The main product — a semantic operating system for knowledge work. Entity system, TQL kernel, projections, and personal tools.',
      startDate: daysFromNow(-90),
      endDate: daysFromNow(90),
      allDay: true,
      priority: 'critical',
      urgency: 'urgent',
      category: 'work',
      tags: ['trellis', 'product', 'platform'],
      owner: 'you',
      involved: ['alex', 'maya', 'jordan', 'eli'],
      references: [
        { kind: 'entity', id: 'ref-pj1-p1', entityId: 'person-1', entityType: 'person', title: 'Alex Chen', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj1-p2', entityId: 'person-2', entityType: 'person', title: 'Maya Rodriguez', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj1-p3', entityId: 'person-3', entityType: 'person', title: 'Jordan Park', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj1-p4', entityId: 'person-4', entityType: 'person', title: 'Eli Torres', direction: 'outgoing' },
      ],
      children: [
        'trellis-dt-1', 'trellis-dt-2', 'trellis-dt-3', 'trellis-dt-m1',
        'trellis-dt-4', 'trellis-dt-5', 'trellis-dt-6',
        'trellis-dt-7', 'trellis-dt-8', 'trellis-dt-9',
        'trellis-dt-10', 'trellis-dt-11', 'trellis-dt-12', 'trellis-dt-m2',
        'project-3',
      ],
      progress: 0.15,
      containerStatus: 'active',
      budget: 50000,
    },
  },
  {
    id: 'entity:project-2',
    data: {
      type: 'project',
      title: 'Q1 Planning & Execution',
      description: 'Quarterly initiative: ship v2, hire frontend engineer, migrate auth, deprecate legacy API.',
      startDate: daysFromNow(-30),
      endDate: daysFromNow(60),
      allDay: true,
      priority: 'high',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['quarterly', 'planning', 'q1'],
      owner: 'you',
      involved: ['alex', 'maya'],
      references: [
        { kind: 'entity', id: 'ref-pj2-t1', entityId: 'task-1', entityType: 'task', title: 'Finish quarterly review slides', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj2-t16', entityId: 'task-16', entityType: 'task', title: 'Prep slide deck for investor update', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj2-n2', entityId: 'note-2', entityType: 'note', title: 'Meeting notes — roadmap planning', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj2-f1', entityId: 'file-1', entityType: 'file', title: 'Q1 Revenue Dashboard.pdf', direction: 'outgoing' },
      ],
      children: ['task-1', 'task-16', 'note-2', 'file-1'],
      progress: 0.3,
      containerStatus: 'active',
      budget: 15000,
    },
  },
  {
    id: 'entity:project-3',
    data: {
      type: 'project',
      title: 'Sprint 14 — API Refactor',
      description: 'Two-week sprint: refactor authentication endpoints, add rate limiting, write integration tests, deploy to staging.',
      startDate: daysFromNow(-1),
      endDate: daysFromNow(13),
      allDay: true,
      priority: 'high',
      urgency: 'urgent',
      category: 'work',
      tags: ['sprint', 'backend', 'api'],
      owner: 'you',
      involved: ['alex', 'jordan'],
      references: [
        { kind: 'entity', id: 'ref-pj3-t12', entityId: 'task-12', entityType: 'task', title: 'Sprint 14 — API refactor', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj3-t14', entityId: 'task-14', entityType: 'task', title: 'Review PR #482 — pagination fix', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj3-n7', entityId: 'note-7', entityType: 'note', title: 'API rate-limiting research', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj3-f4', entityId: 'file-4', entityType: 'file', title: 'Architecture Diagram.png', direction: 'outgoing' },
      ],
      children: ['task-12', 'task-14', 'note-7', 'file-4'],
      progress: 0.25,
      containerStatus: 'active',
      parentEntityId: 'project-1',
    },
  },
  {
    id: 'entity:project-4',
    data: {
      type: 'project',
      title: 'Asheville Trip Planning',
      description: 'Weekend getaway logistics — accommodation, hiking routes, restaurant reservations, and packing.',
      startDate: today,
      endDate: daysFromNow(18),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'travel',
      tags: ['travel', 'vacation', 'planning'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-pj4-tr1', entityId: 'trip-1', entityType: 'trip', title: 'Asheville weekend getaway', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj4-n6', entityId: 'note-6', entityType: 'note', title: 'Vacation packing list — spring trip', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj4-n8', entityId: 'note-8', entityType: 'note', title: 'Trip packing — Asheville', direction: 'outgoing' },
      ],
      children: ['trip-1', 'note-6', 'note-8'],
      progress: 0.4,
      containerStatus: 'active',
    },
  },
  {
    id: 'entity:project-5',
    data: {
      type: 'project',
      title: 'Personal Growth — Q1',
      description: 'Personal development goals: daily journaling, reading 2 books/month, fitness routine, and side projects.',
      startDate: daysFromNow(-30),
      endDate: daysFromNow(60),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['goals', 'personal', 'growth'],
      owner: 'you',
      involved: [],
      references: [
        { kind: 'entity', id: 'ref-pj5-t4', entityId: 'task-4', entityType: 'task', title: 'Read chapter 5 — Replication', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj5-t17', entityId: 'task-17', entityType: 'task', title: 'Journal — daily reflection', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj5-n1', entityId: 'note-1', entityType: 'note', title: 'Project ideas brainstorm', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj5-n4', entityId: 'note-4', entityType: 'note', title: 'Book recommendations', direction: 'outgoing' },
      ],
      children: ['task-4', 'task-17', 'note-1', 'note-3', 'note-4'],
      progress: 0.35,
      containerStatus: 'active',
    },
  },
  {
    id: 'entity:project-6',
    data: {
      type: 'project',
      title: 'CI/CD Migration',
      description: 'Migrate from CircleCI to GitHub Actions for cost savings and better DX. Includes pipeline setup, secret migration, and testing.',
      startDate: daysFromNow(9),
      endDate: daysFromNow(25),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['devops', 'migration', 'ci-cd'],
      owner: 'you',
      involved: ['eli'],
      references: [
        { kind: 'entity', id: 'ref-pj6-t18', entityId: 'task-18', entityType: 'task', title: 'Migrate CI to GitHub Actions', direction: 'outgoing' },
        { kind: 'entity', id: 'ref-pj6-p4', entityId: 'person-4', entityType: 'person', title: 'Eli Torres', direction: 'outgoing' },
      ],
      children: ['task-18'],
      progress: 0,
      containerStatus: 'active',
      parentEntityId: 'project-1',
    },
  },
]

// ============================================================================
// Runner
// ============================================================================

async function seedGroup(label, items) {
  console.log(`\n── ${label} ──`)
  let created = 0
  let skipped = 0

  for (const item of items) {
    try {
      await client.getNode(item.id)
      console.log(`  ⏭  ${item.data.title} (already exists)`)
      skipped++
      continue
    } catch {
      // Doesn't exist — create it
    }

    const result = await client.createNode(item.id, 'entity', item.data)
    if (result.ok) {
      console.log(`  ✓  ${item.data.title}`)
      created++
    } else {
      console.error(`  ✗  ${item.data.title}`)
    }
  }

  console.log(`  → ${created} created, ${skipped} skipped`)
}

async function run() {
  console.log('Seeding entities via trellis CLI client...')

  // Check server is up
  try {
    const h = await client.health()
    console.log(`Server healthy — ${h.factCount} facts, ${h.linkCount} links`)
  } catch {
    console.error('Error: dev server not reachable at http://localhost:4141')
    process.exit(1)
  }

  await seedGroup('People (8)', people)
  await seedGroup('Files (8)', files)
  await seedGroup('Projects (6)', projects)

  console.log('\n✓ Done — 22 entities processed.')
}

run().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})

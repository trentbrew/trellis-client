import type { DatabaseRecord, DatabaseSchema, Workflow, CustomType } from '~/types/database'
import { createDefaultProjections } from '~/lib/projections'
import { createCollectionGraph, serializeTrellisDocument } from '~/lib/trellis'
import { normalizeDatabaseSchema, createDefaultDatabaseSchema } from '~/lib/normalizeDatabaseSchema'

type SeedAppDef = {
  slug: string
  name: string
  icon: string
  color: string
  description: string
}

const DEMO_SEED_V2_VERSION = 3
const DEMO_SEED_V2_VERSION_KEY = 'demoSeedV2Version'
const DEFAULT_WORKSPACE_SLUG = 'default-workspace'

type EnsureDemoSeedV2Params = {
  instant: any
  tx: any
  userId: string
  getSetting: (entityType: 'user' | 'org' | 'app' | 'collection', entityId: string, key: string) => Promise<any>
  upsertSetting: (
    entityType: 'user' | 'org' | 'app' | 'collection',
    entityId: string,
    key: string,
    value: any,
  ) => Promise<void>
}

type SeedRecordDefV2 = {
  /** Stable ID prefix for graph references (e.g., 'account:checking'). If not provided, a UUID is generated. */
  stableId?: string
  title: string
  fields: Record<string, any>
}

type SeedEdgeDefV2 = {
  source: string
  target: string
  relation: string
  properties?: Record<string, unknown>
}

type SeedCollectionDefV2 = {
  slug: string
  title: string
  icon: string
  order: number
  schema: {
    fields: DatabaseSchema['fields']
    views?: DatabaseSchema['views']
  }
  records: SeedRecordDefV2[]
  /** Graph edges for relationships between records */
  edges?: SeedEdgeDefV2[]
}

const createSeededCollectionContentV2 = (options: {
  collectionId: string
  collectionName: string
  collectionDescription?: string
  ownerId: string
  schema: DatabaseSchema
  records: SeedRecordDefV2[]
  edges?: SeedEdgeDefV2[]
}): string => {
  const doc = createCollectionGraph({
    collectionId: options.collectionId,
    collectionName: options.collectionName,
    collectionDescription: options.collectionDescription || '',
    schemaFields: options.schema.fields.map((f) => ({ name: f.name, valueType: f.type })),
  })

  const nowIso = new Date().toISOString()
  const nodes = (doc.graph.nodes as any[]) || []

  for (const r of options.records || []) {
    // Use stableId if provided, otherwise generate UUID
    const recordId = r.stableId || `trellis:record/${crypto.randomUUID()}`
    const record: any = {
      '@id': recordId,
      '@type': 'trellis:Record',
      'trellis:title': r.title,
      'trellis:description': '',
      'trellis:content': { '@type': 'trellis:Document', blocks: [] },
      'trellis:metadata': {
        createdTime: nowIso,
        createdBy: { '@id': options.ownerId },
        lastEditedTime: nowIso,
        lastEditedBy: { '@id': options.ownerId },
      },
    }

    const fields = r.fields || {}
    for (const [fieldId, value] of Object.entries(fields)) {
      record[`user:${fieldId}`] = value
    }

    nodes.push(record)
  }

  ;(doc.graph.nodes as any[]) = nodes

  // Add edges if provided
  if (options.edges?.length) {
    ;(doc.graph.edges as any[]) = options.edges.map((e) => ({
      '@id': `edge:${crypto.randomUUID()}`,
      source: e.source,
      target: e.target,
      relation: e.relation,
      ...(e.properties ? { properties: e.properties } : {}),
    }))
  }

  return serializeTrellisDocument(doc, true)
}

const getDemoSpecV2 = (): {
  org: { name: string; slug: string }
  apps: SeedAppDef[]
  collectionsByAppSlug: Record<string, SeedCollectionDefV2[]>
  customTypesByAppSlug: Record<string, CustomType[]>
  workflowsByAppSlug: Record<string, Workflow[]>
} => {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const isoDay = (offsetDays: number) => new Date(now + offsetDays * dayMs).toISOString()

  const org = { name: 'Default Workspace', slug: DEFAULT_WORKSPACE_SLUG }

  const apps: SeedAppDef[] = [
    {
      slug: 'life',
      name: 'Life',
      icon: 'lucide:sun',
      color: 'bg-emerald-500',
      description: 'Schedule, reminders, finance, relationships, and life ops',
    },
    {
      slug: 'work',
      name: 'Work',
      icon: 'lucide:briefcase',
      color: 'bg-sky-500',
      description: 'Projects, tasks, milestones, and teams',
    },
    {
      slug: 'game-dev-project',
      name: 'Game Dev Project',
      icon: 'lucide:gamepad-2',
      color: 'bg-violet-500',
      description: 'Worldbuilding, writing, mechanics, assets, and milestones',
    },
    {
      slug: 'health',
      name: 'Health',
      icon: 'lucide:heart',
      color: 'bg-rose-500',
      description: 'Habits, workouts, appointments, and measurements',
    },
    {
      slug: 'learning',
      name: 'Learning',
      icon: 'lucide:graduation-cap',
      color: 'bg-amber-500',
      description: 'Reading lists, courses, notes, and practice',
    },
    {
      slug: 'finance',
      name: 'Finance',
      icon: 'lucide:wallet',
      color: 'bg-green-500',
      description: 'Multi-collection budget graph: accounts, categories, budgets, goals, and transactions',
    },
  ]

  const scheduleSchema: Omit<DatabaseSchema, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'> = {
    fields: [
      {
        id: 'category',
        name: 'Category',
        type: 'select',
        required: false,
        order: 0,
        options: [
          { value: 'Personal', color: 'blue' },
          { value: 'Family', color: 'violet' },
          { value: 'Health', color: 'green' },
          { value: 'Admin', color: 'gray' },
        ],
      },
      { id: 'dueDate', name: 'Date', type: 'date', required: false, order: 1 },
      { id: 'startTime', name: 'Start', type: 'text', required: false, order: 2 },
      { id: 'endTime', name: 'End', type: 'text', required: false, order: 3 },
      { id: 'location', name: 'Location', type: 'text', required: false, order: 4 },
      { id: 'attendees', name: 'Attendees', type: 'multiselect', required: false, order: 5 },
      { id: 'notes', name: 'Notes', type: 'text', required: false, order: 6 },
    ],
    views: [
      {
        id: 'view_all',
        name: 'All Events',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
  }

  const remindersSchema: Omit<DatabaseSchema, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'> = {
    fields: [
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        required: false,
        order: 0,
        options: [
          { value: 'Todo', color: 'gray' },
          { value: 'In Progress', color: 'blue' },
          { value: 'Done', color: 'green' },
        ],
      },
      { id: 'dueDate', name: 'Due date', type: 'date', required: false, order: 1 },
      { id: 'priority', name: 'Priority', type: 'number', required: false, order: 2 },
      {
        id: 'category',
        name: 'Category',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'Home', color: 'blue' },
          { value: 'Finance', color: 'violet' },
          { value: 'Health', color: 'green' },
          { value: 'Family', color: 'amber' },
          { value: 'Errands', color: 'gray' },
        ],
      },
      { id: 'relatedPerson', name: 'Related person', type: 'text', required: false, order: 4 },
      {
        id: 'completed',
        name: 'Completed',
        type: 'formula',
        required: false,
        order: 5,
        formula: "status === 'Done'",
        formulaReturnType: 'boolean',
      },
    ],
    views: [
      {
        id: 'view_all',
        name: 'All Reminders',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
  }

  const financeSchema: Omit<DatabaseSchema, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'> = {
    fields: [
      {
        id: 'category',
        name: 'Category',
        type: 'select',
        required: false,
        order: 0,
        options: [
          { value: 'Groceries', color: 'green' },
          { value: 'Rent', color: 'violet' },
          { value: 'Utilities', color: 'blue' },
          { value: 'Transport', color: 'amber' },
          { value: 'Entertainment', color: 'pink' },
          { value: 'Subscriptions', color: 'gray' },
          { value: 'Income', color: 'green' },
        ],
      },
      { id: 'date', name: 'Date', type: 'date', required: false, order: 1 },
      { id: 'amount', name: 'Amount', type: 'number', required: false, order: 2 },
      {
        id: 'account',
        name: 'Account',
        type: 'select',
        required: false,
        order: 3,
        options: [
          { value: 'Checking', color: 'blue' },
          { value: 'Savings', color: 'green' },
          { value: 'Credit Card', color: 'violet' },
        ],
      },
      { id: 'description', name: 'Description', type: 'text', required: false, order: 4 },
      {
        id: 'budgetGoal',
        name: 'Budget goal',
        type: 'select',
        required: false,
        order: 5,
        options: [
          { value: 'Monthly Groceries', color: 'green' },
          { value: 'Monthly Fun Money', color: 'pink' },
          { value: 'Emergency Fund', color: 'blue' },
        ],
      },
      { id: 'recurring', name: 'Recurring', type: 'checkbox', required: false, order: 6 },
    ],
    views: [
      {
        id: 'view_all',
        name: 'All Transactions',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
  }

  const contactsSchema: Omit<DatabaseSchema, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'> = {
    fields: [
      {
        id: 'relationship',
        name: 'Relationship',
        type: 'select',
        required: false,
        order: 0,
        options: [
          { value: 'Family', color: 'violet' },
          { value: 'Friend', color: 'blue' },
          { value: 'Colleague', color: 'gray' },
          { value: 'Provider', color: 'green' },
          { value: 'Other', color: 'amber' },
        ],
      },
      { id: 'email', name: 'Email', type: 'email', required: false, order: 1 },
      { id: 'phone', name: 'Phone', type: 'text', required: false, order: 2 },
      { id: 'birthday', name: 'Birthday', type: 'date', required: false, order: 3 },
      { id: 'notes', name: 'Notes', type: 'text', required: false, order: 4 },
    ],
    views: [
      {
        id: 'view_all',
        name: 'All Contacts',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
  }

  const collectionsByAppSlug: Record<string, SeedCollectionDefV2[]> = {
    life: [
      {
        slug: 'schedule',
        title: 'Schedule',
        icon: 'lucide:calendar-days',
        order: 0,
        schema: scheduleSchema,
        records: [
          {
            title: 'Doctor appointment',
            fields: {
              category: 'Health',
              dueDate: isoDay(2),
              startTime: '09:00',
              endTime: '10:00',
              location: 'Downtown Clinic',
              attendees: ['Dr. Smith'],
              notes: 'Bring insurance card',
            },
          },
          {
            title: 'Yoga class',
            fields: {
              category: 'Health',
              dueDate: isoDay(1),
              startTime: '18:00',
              endTime: '19:00',
              location: 'Lotus Studio',
              attendees: [],
              notes: '',
            },
          },
          {
            title: 'Dinner with family',
            fields: {
              category: 'Family',
              dueDate: isoDay(3),
              startTime: '19:00',
              endTime: '21:00',
              location: "Mom's house",
              attendees: ['Mom', 'Dad', 'Sarah'],
              notes: 'Offer to bring dessert',
            },
          },
          {
            title: 'Coffee with Alex',
            fields: {
              category: 'Personal',
              dueDate: isoDay(4),
              startTime: '11:00',
              endTime: '12:00',
              location: 'Blue Bottle',
              attendees: ['Alex'],
              notes: '',
            },
          },
          {
            title: 'Car registration renewal',
            fields: {
              category: 'Admin',
              dueDate: isoDay(7),
              startTime: '11:30',
              endTime: '12:00',
              location: 'DMV',
              attendees: [],
              notes: 'Bring registration + proof of insurance',
            },
          },
        ],
      },
      {
        slug: 'reminders',
        title: 'Reminders',
        icon: 'lucide:check-square',
        order: 1,
        schema: remindersSchema,
        records: [
          {
            title: 'Pay credit card bill',
            fields: {
              status: 'Todo',
              dueDate: isoDay(2),
              priority: 3,
              category: 'Finance',
              relatedPerson: '',
            },
          },
          {
            title: 'Schedule dentist follow-up',
            fields: {
              status: 'Todo',
              dueDate: isoDay(14),
              priority: 2,
              category: 'Health',
              relatedPerson: '',
            },
          },
          {
            title: 'Buy birthday gift for Mom',
            fields: {
              status: 'In Progress',
              dueDate: isoDay(10),
              priority: 2,
              category: 'Family',
              relatedPerson: 'Mom',
            },
          },
          {
            title: 'Replace air filter',
            fields: {
              status: 'Todo',
              dueDate: isoDay(5),
              priority: 1,
              category: 'Home',
              relatedPerson: '',
            },
          },
          {
            title: 'Call plumber about leak',
            fields: {
              status: 'Todo',
              dueDate: isoDay(1),
              priority: 2,
              category: 'Home',
              relatedPerson: '',
            },
          },
          {
            title: 'Book annual checkup',
            fields: {
              status: 'Todo',
              dueDate: isoDay(21),
              priority: 2,
              category: 'Health',
              relatedPerson: 'Dr. Smith',
            },
          },
          {
            title: 'Cancel unused subscription',
            fields: {
              status: 'Done',
              dueDate: isoDay(-2),
              priority: 1,
              category: 'Finance',
              relatedPerson: '',
            },
          },
          {
            title: 'Plan weekend hike',
            fields: {
              status: 'In Progress',
              dueDate: isoDay(6),
              priority: 1,
              category: 'Errands',
              relatedPerson: 'Alex',
            },
          },
        ],
      },
      {
        slug: 'finance',
        title: 'Finance',
        icon: 'lucide:wallet',
        order: 2,
        schema: financeSchema,
        records: [
          {
            title: 'Paycheck',
            fields: {
              category: 'Income',
              date: isoDay(-7),
              amount: 3200,
              account: 'Checking',
              description: 'Monthly salary',
              budgetGoal: 'Emergency Fund',
              recurring: true,
            },
          },
          {
            title: 'Rent',
            fields: {
              category: 'Rent',
              date: isoDay(-6),
              amount: -1850,
              account: 'Checking',
              description: 'January rent',
              budgetGoal: 'Emergency Fund',
              recurring: true,
            },
          },
          {
            title: 'Grocery run',
            fields: {
              category: 'Groceries',
              date: isoDay(-5),
              amount: -84.12,
              account: 'Credit Card',
              description: 'Weekly groceries',
              budgetGoal: 'Monthly Groceries',
              recurring: false,
            },
          },
          {
            title: 'Utilities',
            fields: {
              category: 'Utilities',
              date: isoDay(-4),
              amount: -123.44,
              account: 'Checking',
              description: 'Electric bill',
              budgetGoal: 'Emergency Fund',
              recurring: true,
            },
          },
          {
            title: 'Gas',
            fields: {
              category: 'Transport',
              date: isoDay(-3),
              amount: -52.44,
              account: 'Credit Card',
              description: 'Gas station',
              budgetGoal: 'Monthly Fun Money',
              recurring: false,
            },
          },
          {
            title: 'Netflix',
            fields: {
              category: 'Subscriptions',
              date: isoDay(-2),
              amount: -15.49,
              account: 'Credit Card',
              description: 'Streaming subscription',
              budgetGoal: 'Monthly Fun Money',
              recurring: true,
            },
          },
          {
            title: 'Coffee',
            fields: {
              category: 'Entertainment',
              date: isoDay(-1),
              amount: -5.5,
              account: 'Credit Card',
              description: 'Coffee with Alex',
              budgetGoal: 'Monthly Fun Money',
              recurring: false,
            },
          },
          {
            title: 'Gym membership',
            fields: {
              category: 'Subscriptions',
              date: isoDay(-1),
              amount: -45,
              account: 'Checking',
              description: 'Gym membership',
              budgetGoal: 'Monthly Fun Money',
              recurring: true,
            },
          },
        ],
      },
      {
        slug: 'contacts',
        title: 'Contacts',
        icon: 'lucide:contact',
        order: 3,
        schema: contactsSchema,
        records: [
          {
            title: 'Mom',
            fields: {
              relationship: 'Family',
              email: 'mom@example.com',
              phone: '(555) 010-1111',
              birthday: '1965-05-12',
              notes: 'Loves gardening and baking',
            },
          },
          {
            title: 'Dad',
            fields: {
              relationship: 'Family',
              email: 'dad@example.com',
              phone: '(555) 010-2222',
              birthday: '1963-11-03',
              notes: 'Ask about the camping trip',
            },
          },
          {
            title: 'Sarah',
            fields: {
              relationship: 'Family',
              email: 'sarah@example.com',
              phone: '(555) 010-3333',
              birthday: '1992-08-20',
              notes: 'Send her the playlist',
            },
          },
          {
            title: 'Alex',
            fields: {
              relationship: 'Friend',
              email: 'alex@example.com',
              phone: '(555) 010-4444',
              birthday: '1990-02-14',
              notes: 'Hiking buddy',
            },
          },
          {
            title: 'Dr. Smith',
            fields: {
              relationship: 'Provider',
              email: 'drsmith@clinic.example',
              phone: '(555) 010-5555',
              birthday: '',
              notes: 'Primary care physician',
            },
          },
          {
            title: 'Dentist Office',
            fields: {
              relationship: 'Provider',
              email: 'frontdesk@dentist.example',
              phone: '(555) 010-6666',
              birthday: '',
              notes: 'Call to schedule follow-up',
            },
          },
        ],
      },
    ],
    work: [],
    'game-dev-project': [],
    health: [],
    learning: [],
    // Finance app - multi-collection budget graph with edges demonstrating graph traversal
    finance: [
      // Accounts collection
      {
        slug: 'accounts',
        title: 'Accounts',
        icon: 'lucide:landmark',
        order: 0,
        schema: {
          fields: [
            {
              id: 'accountType',
              name: 'Type',
              type: 'select',
              required: true,
              order: 0,
              options: [
                { value: 'Checking', color: 'blue' },
                { value: 'Savings', color: 'green' },
                { value: 'Credit Card', color: 'red' },
                { value: 'Cash', color: 'amber' },
                { value: 'Investment', color: 'purple' },
              ],
              isDefault: false,
            },
            { id: 'balance', name: 'Balance', type: 'number', required: false, order: 1, isDefault: false },
            { id: 'institution', name: 'Institution', type: 'text', required: false, order: 2, isDefault: false },
            { id: 'lastUpdated', name: 'Last Updated', type: 'date', required: false, order: 3, isDefault: false },
          ],
        },
        records: [
          { stableId: 'account:checking', title: 'Checking Account', fields: { accountType: 'Checking', balance: 3200, institution: 'First National Bank', lastUpdated: isoDay(0) } },
          { stableId: 'account:savings', title: 'Savings Account', fields: { accountType: 'Savings', balance: 8500, institution: 'First National Bank', lastUpdated: isoDay(0) } },
          { stableId: 'account:credit', title: 'Credit Card', fields: { accountType: 'Credit Card', balance: -420, institution: 'Chase', lastUpdated: isoDay(0) } },
          { stableId: 'account:cash', title: 'Cash on Hand', fields: { accountType: 'Cash', balance: 150, institution: '', lastUpdated: isoDay(-3) } },
        ],
      },
      // Categories collection with hierarchical structure
      {
        slug: 'categories',
        title: 'Categories',
        icon: 'lucide:tags',
        order: 1,
        schema: {
          fields: [
            {
              id: 'categoryType',
              name: 'Type',
              type: 'select',
              required: true,
              order: 0,
              options: [
                { value: 'Income', color: 'green' },
                { value: 'Expense', color: 'red' },
                { value: 'Transfer', color: 'blue' },
              ],
              isDefault: false,
            },
            { id: 'parentCategory', name: 'Parent Category', type: 'text', required: false, order: 1, isDefault: false },
            { id: 'color', name: 'Color', type: 'text', required: false, order: 2, isDefault: false },
          ],
        },
        records: [
          // Top-level expense categories
          { stableId: 'cat:housing', title: 'Housing', fields: { categoryType: 'Expense', parentCategory: '', color: '#8B5CF6' } },
          { stableId: 'cat:food', title: 'Food', fields: { categoryType: 'Expense', parentCategory: '', color: '#F97316' } },
          { stableId: 'cat:transport', title: 'Transport', fields: { categoryType: 'Expense', parentCategory: '', color: '#3B82F6' } },
          { stableId: 'cat:entertainment', title: 'Entertainment', fields: { categoryType: 'Expense', parentCategory: '', color: '#EC4899' } },
          // Sub-categories
          { stableId: 'cat:rent', title: 'Rent', fields: { categoryType: 'Expense', parentCategory: 'Housing', color: '#A78BFA' } },
          { stableId: 'cat:utilities', title: 'Utilities', fields: { categoryType: 'Expense', parentCategory: 'Housing', color: '#C4B5FD' } },
          { stableId: 'cat:groceries', title: 'Groceries', fields: { categoryType: 'Expense', parentCategory: 'Food', color: '#FB923C' } },
          { stableId: 'cat:dining', title: 'Dining Out', fields: { categoryType: 'Expense', parentCategory: 'Food', color: '#FDBA74' } },
          { stableId: 'cat:fuel', title: 'Fuel', fields: { categoryType: 'Expense', parentCategory: 'Transport', color: '#60A5FA' } },
          { stableId: 'cat:transit', title: 'Transit', fields: { categoryType: 'Expense', parentCategory: 'Transport', color: '#93C5FD' } },
          { stableId: 'cat:subscriptions', title: 'Subscriptions', fields: { categoryType: 'Expense', parentCategory: 'Entertainment', color: '#F472B6' } },
          // Income categories
          { stableId: 'cat:income', title: 'Income', fields: { categoryType: 'Income', parentCategory: '', color: '#10B981' } },
          { stableId: 'cat:salary', title: 'Salary', fields: { categoryType: 'Income', parentCategory: 'Income', color: '#34D399' } },
          { stableId: 'cat:freelance', title: 'Freelance', fields: { categoryType: 'Income', parentCategory: 'Income', color: '#6EE7B7' } },
        ],
        edges: [
          // Category hierarchy edges
          { source: 'cat:housing', target: 'cat:rent', relation: 'hasChild' },
          { source: 'cat:housing', target: 'cat:utilities', relation: 'hasChild' },
          { source: 'cat:food', target: 'cat:groceries', relation: 'hasChild' },
          { source: 'cat:food', target: 'cat:dining', relation: 'hasChild' },
          { source: 'cat:transport', target: 'cat:fuel', relation: 'hasChild' },
          { source: 'cat:transport', target: 'cat:transit', relation: 'hasChild' },
          { source: 'cat:entertainment', target: 'cat:subscriptions', relation: 'hasChild' },
          { source: 'cat:income', target: 'cat:salary', relation: 'hasChild' },
          { source: 'cat:income', target: 'cat:freelance', relation: 'hasChild' },
        ],
      },
      // Budgets collection
      {
        slug: 'budgets',
        title: 'Budgets',
        icon: 'lucide:calculator',
        order: 2,
        schema: {
          fields: [
            { id: 'amount', name: 'Budget Amount', type: 'number', required: true, order: 0, isDefault: false },
            {
              id: 'period',
              name: 'Period',
              type: 'select',
              required: true,
              order: 1,
              options: [
                { value: 'Weekly', color: 'blue' },
                { value: 'Monthly', color: 'green' },
                { value: 'Quarterly', color: 'amber' },
                { value: 'Yearly', color: 'purple' },
              ],
              isDefault: false,
            },
            { id: 'category', name: 'Category', type: 'text', required: false, order: 2, isDefault: false },
            { id: 'spent', name: 'Spent', type: 'number', required: false, order: 3, isDefault: false },
          ],
        },
        records: [
          { stableId: 'budget:rent', title: 'Rent Budget', fields: { amount: 2000, period: 'Monthly', category: 'Rent', spent: 1850 } },
          { stableId: 'budget:utilities', title: 'Utilities Budget', fields: { amount: 300, period: 'Monthly', category: 'Utilities', spent: 123.44 } },
          { stableId: 'budget:groceries', title: 'Groceries Budget', fields: { amount: 450, period: 'Monthly', category: 'Groceries', spent: 400 } },
          { stableId: 'budget:dining', title: 'Dining Budget', fields: { amount: 200, period: 'Monthly', category: 'Dining Out', spent: 93 } },
          { stableId: 'budget:fuel', title: 'Fuel Budget', fields: { amount: 180, period: 'Monthly', category: 'Fuel', spent: 122.44 } },
          { stableId: 'budget:transit', title: 'Transit Budget', fields: { amount: 120, period: 'Monthly', category: 'Transit', spent: 110 } },
          { stableId: 'budget:subscriptions', title: 'Subscriptions Budget', fields: { amount: 100, period: 'Monthly', category: 'Subscriptions', spent: 60.49 } },
        ],
        edges: [
          // Budget → Category relationships
          { source: 'budget:rent', target: 'cat:rent', relation: 'appliesTo' },
          { source: 'budget:utilities', target: 'cat:utilities', relation: 'appliesTo' },
          { source: 'budget:groceries', target: 'cat:groceries', relation: 'appliesTo' },
          { source: 'budget:dining', target: 'cat:dining', relation: 'appliesTo' },
          { source: 'budget:fuel', target: 'cat:fuel', relation: 'appliesTo' },
          { source: 'budget:transit', target: 'cat:transit', relation: 'appliesTo' },
          { source: 'budget:subscriptions', target: 'cat:subscriptions', relation: 'appliesTo' },
        ],
      },
      // Goals collection
      {
        slug: 'goals',
        title: 'Goals',
        icon: 'lucide:target',
        order: 3,
        schema: {
          fields: [
            { id: 'targetAmount', name: 'Target Amount', type: 'number', required: true, order: 0, isDefault: false },
            { id: 'currentAmount', name: 'Current Amount', type: 'number', required: false, order: 1, isDefault: false },
            { id: 'targetDate', name: 'Target Date', type: 'date', required: false, order: 2, isDefault: false },
            { id: 'account', name: 'Account', type: 'text', required: false, order: 3, isDefault: false },
            {
              id: 'priority',
              name: 'Priority',
              type: 'select',
              required: false,
              order: 4,
              options: [
                { value: 'High', color: 'red' },
                { value: 'Medium', color: 'amber' },
                { value: 'Low', color: 'green' },
              ],
              isDefault: false,
            },
          ],
        },
        records: [
          { stableId: 'goal:emergency', title: 'Emergency Fund', fields: { targetAmount: 10000, currentAmount: 8500, targetDate: isoDay(180), account: 'Savings Account', priority: 'High' } },
          { stableId: 'goal:vacation', title: 'Vacation Fund', fields: { targetAmount: 2500, currentAmount: 1200, targetDate: isoDay(120), account: 'Checking Account', priority: 'Medium' } },
          { stableId: 'goal:newcar', title: 'New Car Fund', fields: { targetAmount: 15000, currentAmount: 3000, targetDate: isoDay(365), account: 'Savings Account', priority: 'Low' } },
        ],
        edges: [
          // Goal → Account relationships
          { source: 'goal:emergency', target: 'account:savings', relation: 'targets' },
          { source: 'goal:vacation', target: 'account:checking', relation: 'targets' },
          { source: 'goal:newcar', target: 'account:savings', relation: 'targets' },
        ],
      },
      // Transactions collection - the main collection with edges to accounts and categories
      {
        slug: 'transactions',
        title: 'Transactions',
        icon: 'lucide:arrow-left-right',
        order: 4,
        schema: {
          fields: [
            { id: 'amount', name: 'Amount', type: 'number', required: true, order: 0, isDefault: false },
            { id: 'date', name: 'Date', type: 'date', required: true, order: 1, isDefault: false },
            { id: 'category', name: 'Category', type: 'text', required: false, order: 2, isDefault: false },
            { id: 'account', name: 'Account', type: 'text', required: false, order: 3, isDefault: false },
            { id: 'payee', name: 'Payee', type: 'text', required: false, order: 4, isDefault: false },
            { id: 'notes', name: 'Notes', type: 'text', required: false, order: 5, isDefault: false },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: false,
              order: 6,
              options: [
                { value: 'Cleared', color: 'green' },
                { value: 'Pending', color: 'amber' },
                { value: 'Reconciled', color: 'blue' },
              ],
              isDefault: false,
            },
          ],
        },
        records: [
          // Income
          { stableId: 'tx:paycheck-1', title: 'Paycheck', fields: { amount: 3200, date: isoDay(-14), category: 'Salary', account: 'Checking Account', payee: 'Employer Inc', notes: 'Monthly salary', status: 'Cleared' } },
          { stableId: 'tx:freelance-1', title: 'Freelance Project', fields: { amount: 500, date: isoDay(-7), category: 'Freelance', account: 'Checking Account', payee: 'Client ABC', notes: 'Website redesign', status: 'Cleared' } },
          // Housing
          { stableId: 'tx:rent-jan', title: 'January Rent', fields: { amount: -1850, date: isoDay(-10), category: 'Rent', account: 'Checking Account', payee: 'Downtown Properties', notes: 'January rent', status: 'Cleared' } },
          { stableId: 'tx:utilities-jan', title: 'Utilities', fields: { amount: -123.44, date: isoDay(-8), category: 'Utilities', account: 'Checking Account', payee: 'City Utilities', notes: 'Electric + water', status: 'Cleared' } },
          // Food
          { stableId: 'tx:groceries-1', title: 'Groceries - Week 1', fields: { amount: -140, date: isoDay(-12), category: 'Groceries', account: 'Checking Account', payee: 'Fresh Market', notes: 'Weekly groceries', status: 'Cleared' } },
          { stableId: 'tx:groceries-2', title: 'Groceries - Week 2', fields: { amount: -125, date: isoDay(-5), category: 'Groceries', account: 'Checking Account', payee: 'Fresh Market', notes: 'Weekly groceries', status: 'Cleared' } },
          { stableId: 'tx:groceries-3', title: 'Groceries - Week 3', fields: { amount: -135, date: isoDay(-1), category: 'Groceries', account: 'Credit Card', payee: 'Whole Foods', notes: 'Weekly groceries', status: 'Pending' } },
          { stableId: 'tx:dining-1', title: 'Dinner Out', fields: { amount: -65, date: isoDay(-9), category: 'Dining Out', account: 'Credit Card', payee: 'Bistro 44', notes: 'Date night', status: 'Cleared' } },
          { stableId: 'tx:dining-2', title: 'Lunch', fields: { amount: -28, date: isoDay(-3), category: 'Dining Out', account: 'Credit Card', payee: 'Cafe Corner', notes: 'Business lunch', status: 'Cleared' } },
          // Transport
          { stableId: 'tx:fuel-1', title: 'Gas Fill-up', fields: { amount: -52.44, date: isoDay(-11), category: 'Fuel', account: 'Credit Card', payee: 'Shell Station', notes: '', status: 'Cleared' } },
          { stableId: 'tx:fuel-2', title: 'Gas Fill-up', fields: { amount: -70, date: isoDay(-4), category: 'Fuel', account: 'Credit Card', payee: 'Chevron', notes: '', status: 'Cleared' } },
          { stableId: 'tx:transit-1', title: 'Monthly Transit Pass', fields: { amount: -110, date: isoDay(-13), category: 'Transit', account: 'Checking Account', payee: 'Metro Transit', notes: 'January pass', status: 'Cleared' } },
          // Subscriptions
          { stableId: 'tx:netflix', title: 'Netflix', fields: { amount: -15.49, date: isoDay(-6), category: 'Subscriptions', account: 'Credit Card', payee: 'Netflix', notes: 'Monthly streaming', status: 'Cleared' } },
          { stableId: 'tx:gym', title: 'Gym Membership', fields: { amount: -45, date: isoDay(-2), category: 'Subscriptions', account: 'Checking Account', payee: 'Planet Fitness', notes: 'Monthly membership', status: 'Cleared' } },
          // Savings transfer
          { stableId: 'tx:savings-transfer', title: 'Transfer to Savings', fields: { amount: -500, date: isoDay(-1), category: 'Transfer', account: 'Checking Account', payee: 'Internal Transfer', notes: 'Emergency fund contribution', status: 'Cleared' } },
        ],
        edges: [
          // Transaction → Category edges
          { source: 'tx:paycheck-1', target: 'cat:salary', relation: 'categorizedAs' },
          { source: 'tx:freelance-1', target: 'cat:freelance', relation: 'categorizedAs' },
          { source: 'tx:rent-jan', target: 'cat:rent', relation: 'categorizedAs' },
          { source: 'tx:utilities-jan', target: 'cat:utilities', relation: 'categorizedAs' },
          { source: 'tx:groceries-1', target: 'cat:groceries', relation: 'categorizedAs' },
          { source: 'tx:groceries-2', target: 'cat:groceries', relation: 'categorizedAs' },
          { source: 'tx:groceries-3', target: 'cat:groceries', relation: 'categorizedAs' },
          { source: 'tx:dining-1', target: 'cat:dining', relation: 'categorizedAs' },
          { source: 'tx:dining-2', target: 'cat:dining', relation: 'categorizedAs' },
          { source: 'tx:fuel-1', target: 'cat:fuel', relation: 'categorizedAs' },
          { source: 'tx:fuel-2', target: 'cat:fuel', relation: 'categorizedAs' },
          { source: 'tx:transit-1', target: 'cat:transit', relation: 'categorizedAs' },
          { source: 'tx:netflix', target: 'cat:subscriptions', relation: 'categorizedAs' },
          { source: 'tx:gym', target: 'cat:subscriptions', relation: 'categorizedAs' },
          // Transaction → Account edges
          { source: 'account:checking', target: 'tx:paycheck-1', relation: 'funds' },
          { source: 'account:checking', target: 'tx:freelance-1', relation: 'funds' },
          { source: 'account:checking', target: 'tx:rent-jan', relation: 'funds' },
          { source: 'account:checking', target: 'tx:utilities-jan', relation: 'funds' },
          { source: 'account:checking', target: 'tx:groceries-1', relation: 'funds' },
          { source: 'account:checking', target: 'tx:groceries-2', relation: 'funds' },
          { source: 'account:credit', target: 'tx:groceries-3', relation: 'funds' },
          { source: 'account:credit', target: 'tx:dining-1', relation: 'funds' },
          { source: 'account:credit', target: 'tx:dining-2', relation: 'funds' },
          { source: 'account:credit', target: 'tx:fuel-1', relation: 'funds' },
          { source: 'account:credit', target: 'tx:fuel-2', relation: 'funds' },
          { source: 'account:checking', target: 'tx:transit-1', relation: 'funds' },
          { source: 'account:credit', target: 'tx:netflix', relation: 'funds' },
          { source: 'account:checking', target: 'tx:gym', relation: 'funds' },
          { source: 'account:checking', target: 'tx:savings-transfer', relation: 'funds' },
        ],
      },
    ],
  }

  const customTypesByAppSlug: Record<string, CustomType[]> = {
    life: [
      {
        id: crypto.randomUUID(),
        appId: 'appId:life',
        name: 'Person',
        description: 'A person in your life',
        icon: 'lucide:user',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:life',
        name: 'Event',
        description: 'A scheduled event',
        icon: 'lucide:calendar-days',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:life',
        name: 'Reminder',
        description: 'A reminder/task',
        icon: 'lucide:check-square',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:life',
        name: 'Transaction',
        description: 'A financial transaction',
        icon: 'lucide:arrow-left-right',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:life',
        name: 'BudgetGoal',
        description: 'A budgeting target or envelope',
        icon: 'lucide:piggy-bank',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
    ],
    work: [],
    'game-dev-project': [],
    health: [],
    learning: [],
    finance: [
      {
        id: crypto.randomUUID(),
        appId: 'appId:finance',
        name: 'Account',
        description: 'A financial account (checking, savings, credit card, etc.)',
        icon: 'lucide:landmark',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:finance',
        name: 'Category',
        description: 'A transaction category for budgeting',
        icon: 'lucide:tags',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:finance',
        name: 'Budget',
        description: 'A spending budget for a category',
        icon: 'lucide:calculator',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:finance',
        name: 'Goal',
        description: 'A savings goal',
        icon: 'lucide:target',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        appId: 'appId:finance',
        name: 'Transaction',
        description: 'A financial transaction',
        icon: 'lucide:arrow-left-right',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
    ],
  }

  const workflowsByAppSlug: Record<string, Workflow[]> = {
    life: [],
    work: [],
    'game-dev-project': [],
    health: [],
    learning: [],
    finance: [],
  }

  return { org, apps, collectionsByAppSlug, customTypesByAppSlug, workflowsByAppSlug }
}

export async function ensureDemoSeedV2(params: EnsureDemoSeedV2Params) {
  const { instant, tx, userId, getSetting, upsertSetting } = params

  const current = await getSetting('user', userId, DEMO_SEED_V2_VERSION_KEY)
  const currentVersion = typeof current === 'number' ? current : 0

  const { org, apps, collectionsByAppSlug, customTypesByAppSlug, workflowsByAppSlug } = getDemoSpecV2()

  const orgResp = await instant.queryOnce({
    organizations: {
      $: {
        where: {
          ownerId: userId,
          slug: org.slug,
        },
      },
    },
  })

  const existingOrg = (orgResp.data as any)?.organizations?.[0]
  let orgId = existingOrg?.id as string | undefined

  if (!orgId) {
    orgId = crypto.randomUUID()
    const now = Date.now()
    await instant.transact([
      tx.organizations[orgId].create({
        ownerId: userId,
        name: org.name,
        slug: org.slug,
        plan: 'free',
        createdAt: now,
        updatedAt: now,
      }),
    ])
  }

  const appIdsBySlug = new Map<string, string>()

  for (const def of apps) {
    const resp = await instant.queryOnce({
      applications: {
        $: {
          where: {
            ownerId: userId,
            orgId,
            slug: def.slug,
          },
        },
      },
    })

    const existing = (resp.data as any)?.applications?.[0]

    if (existing?.id) {
      appIdsBySlug.set(def.slug, existing.id)
      continue
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await instant.transact([
      tx.applications[id].create({
        ownerId: userId,
        orgId,
        name: def.name,
        slug: def.slug,
        icon: def.icon,
        color: def.color,
        description: def.description,
        createdAt: now,
        updatedAt: now,
      }),
      tx.organizations[orgId].link({ applications: id }),
    ])

    appIdsBySlug.set(def.slug, id)
  }

  for (const [appSlug, appId] of appIdsBySlug.entries()) {
    const collectionDefs = collectionsByAppSlug[appSlug] || []
    for (const colDef of collectionDefs) {
      const resp = await instant.queryOnce({
        collections: {
          $: {
            where: {
              appId,
              slug: colDef.slug,
            },
          },
        },
      })

      const existing = (resp.data as any)?.collections?.[0]
      let collectionId = existing?.id as string | undefined

      const shouldSetContent = !(typeof existing?.content === 'string' && existing.content.trim())

      if (!collectionId) {
        collectionId = crypto.randomUUID()
        const now = Date.now()

        await instant.transact([
          tx.collections[collectionId].create({
            ownerId: userId,
            appId,
            parentId: null,
            title: colDef.title,
            slug: colDef.slug,
            icon: colDef.icon,
            type: 'database',
            order: colDef.order,
            isPublished: true,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          }),
          tx.applications[appId].link({ collections: collectionId }),
        ])
      }

      const schema: DatabaseSchema = {
        id: '',
        collectionId,
        fields: colDef.schema.fields,
        views: colDef.schema.views ?? createDefaultDatabaseSchema(collectionId).views,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await ensureSettingIfMissing(instant, tx, userId, 'collection', collectionId, 'schema', schema)

      if (currentVersion < DEMO_SEED_V2_VERSION && appSlug === 'life' && colDef.slug === 'reminders') {
        const existingSchemaValue = await getSetting('collection', collectionId, 'schema')
        const normalized = normalizeDatabaseSchema(existingSchemaValue || schema, collectionId)

        const patchedFields = (normalized.fields || []).map((f) => {
          if (f.id !== 'completed') return f
          if (f.type === 'formula' && f.formulaReturnType === 'boolean' && typeof f.formula === 'string') return f
          return {
            ...f,
            type: 'formula' as const,
            formula: "status === 'Done'",
            formulaReturnType: 'boolean' as const,
            required: false,
          }
        })

        const patchedSchema: DatabaseSchema = {
          ...normalized,
          fields: patchedFields,
          updatedAt: Date.now(),
        }

        await upsertSetting('collection', collectionId, 'schema', patchedSchema)
      }
      await ensureSettingIfMissing(
        instant,
        tx,
        userId,
        'collection',
        collectionId,
        'projections',
        createDefaultProjections(collectionId, 'database'),
      )

      if (shouldSetContent) {
        const content = createSeededCollectionContentV2({
          collectionId,
          collectionName: colDef.title,
          collectionDescription: '',
          ownerId: userId,
          schema,
          records: colDef.records,
          edges: colDef.edges,
        })

        await instant.transact([
          tx.collections[collectionId].update({
            content,
            updatedAt: Date.now(),
          }),
        ])
      }
    }

    const types = (customTypesByAppSlug[appSlug] || []).map((t) => ({
      ...t,
      appId,
    }))
    const workflows = (workflowsByAppSlug[appSlug] || []).map((w) => ({
      ...w,
      appId,
    }))

    await ensureSettingIfMissing(instant, tx, userId, 'app', appId, 'customTypes', types)
    await ensureSettingIfMissing(instant, tx, userId, 'app', appId, 'workflows', workflows)
  }

  if (currentVersion < DEMO_SEED_V2_VERSION) {
    await upsertSetting('user', userId, DEMO_SEED_V2_VERSION_KEY, DEMO_SEED_V2_VERSION)
  }

  // Verify that apps are actually visible for this org. If not, fail loudly so
  // callers can surface a helpful error instead of showing a success toast.
  const verifyApps = await instant.queryOnce({
    applications: {
      $: {
        where: {
          ownerId: userId,
          orgId,
        },
      },
    },
  })
  const createdApps = ((verifyApps.data as any)?.applications || []) as any[]
  if (createdApps.length === 0) {
    throw new Error('Demo seed verification failed: no applications visible for the seeded org')
  }

  return {
    orgId,
    appIdsBySlug: Object.fromEntries(appIdsBySlug.entries()),
  }
}

type SeedCollectionDef = {
  slug: string
  title: string
  icon: string
  order: number
  schema: Omit<DatabaseSchema, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'>
  records: Array<Omit<DatabaseRecord, 'id' | 'collectionId' | 'createdAt' | 'updatedAt'>>
}

type EnsureDemoSeedParams = {
  instant: any
  tx: any
  userId: string
  orgId: string
  getSetting: (entityType: 'user' | 'org' | 'app' | 'collection', entityId: string, key: string) => Promise<any>
  upsertSetting: (
    entityType: 'user' | 'org' | 'app' | 'collection',
    entityId: string,
    key: string,
    value: any,
  ) => Promise<void>
}

const DEMO_SEED_VERSION = 1

const getDemoSpecV1 = (): {
  apps: SeedAppDef[]
  collectionsByAppSlug: Record<string, SeedCollectionDef[]>
  customTypesByAppSlug: Record<string, CustomType[]>
  workflowsByAppSlug: Record<string, Workflow[]>
} => {
  const now = Date.now()

  const apps: SeedAppDef[] = [
    {
      slug: 'personal',
      name: 'Personal',
      icon: 'lucide:layout',
      color: 'bg-primary',
      description: 'Personal workspace',
    },
    {
      slug: 'connector-hub',
      name: 'Connector Hub',
      icon: 'lucide:plug',
      color: 'bg-sky-500',
      description: 'Integrations, connectors, and sync runs',
    },
    {
      slug: 'trip-planner',
      name: 'Trip Planner',
      icon: 'lucide:map',
      color: 'bg-emerald-500',
      description: 'Trips, itineraries, and bookings',
    },
    {
      slug: 'family-finance',
      name: 'Family Finance',
      icon: 'lucide:wallet',
      color: 'bg-violet-500',
      description: 'Accounts, transactions, budgets, and categories',
    },
  ]

  const collectionsByAppSlug: Record<string, SeedCollectionDef[]> = {
    personal: [
      {
        slug: 'home',
        title: 'Home',
        icon: 'lucide:home',
        order: 0,
        schema: {
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: false,
              order: 1,
              options: [{ value: 'Open', color: 'blue' }],
            },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Records',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'notes',
        title: 'Notes',
        icon: 'lucide:sticky-note',
        order: 1,
        schema: {
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
            { id: 'body', name: 'Body', type: 'text', required: false, order: 1 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Notes',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [
          {
            fields: { title: 'Welcome', body: 'This is your seeded demo workspace.' },
            createdBy: 'system',
          },
        ],
      },
    ],
    'connector-hub': [
      {
        slug: 'connectors',
        title: 'Connectors',
        icon: 'lucide:plug',
        order: 0,
        schema: {
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: true,
              order: 1,
              options: [
                { value: 'Connected', color: 'green' },
                { value: 'Needs Auth', color: 'yellow' },
                { value: 'Error', color: 'red' },
              ],
            },
            { id: 'provider', name: 'Provider', type: 'text', required: false, order: 2 },
            { id: 'lastSyncAt', name: 'Last Sync', type: 'date', required: false, order: 3 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Connectors',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [
          { fields: { name: 'Slack', status: 'Connected', provider: 'Slack', lastSyncAt: now }, createdBy: 'system' },
          {
            fields: { name: 'Google Drive', status: 'Needs Auth', provider: 'Google', lastSyncAt: now },
            createdBy: 'system',
          },
        ],
      },
      {
        slug: 'sync-jobs',
        title: 'Sync Jobs',
        icon: 'lucide:refresh-cw',
        order: 1,
        schema: {
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            { id: 'schedule', name: 'Schedule', type: 'text', required: false, order: 1 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: false,
              order: 2,
              options: [
                { value: 'Active', color: 'green' },
                { value: 'Paused', color: 'gray' },
              ],
            },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Jobs',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'runs',
        title: 'Runs',
        icon: 'lucide:activity',
        order: 2,
        schema: {
          fields: [
            { id: 'job', name: 'Job', type: 'text', required: true, order: 0 },
            {
              id: 'result',
              name: 'Result',
              type: 'select',
              required: false,
              order: 1,
              options: [
                { value: 'Success', color: 'green' },
                { value: 'Failed', color: 'red' },
              ],
            },
            { id: 'startedAt', name: 'Started At', type: 'date', required: false, order: 2 },
            { id: 'durationMs', name: 'Duration (ms)', type: 'number', required: false, order: 3 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Runs',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'logs',
        title: 'Logs',
        icon: 'lucide:file-text',
        order: 3,
        schema: {
          fields: [
            { id: 'message', name: 'Message', type: 'text', required: true, order: 0 },
            {
              id: 'level',
              name: 'Level',
              type: 'select',
              required: false,
              order: 1,
              options: [{ value: 'Info', color: 'blue' }],
            },
            { id: 'timestamp', name: 'Timestamp', type: 'date', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Logs',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
    ],
    'trip-planner': [
      {
        slug: 'trips',
        title: 'Trips',
        icon: 'lucide:map-pin',
        order: 0,
        schema: {
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
            { id: 'startDate', name: 'Start Date', type: 'date', required: false, order: 1 },
            { id: 'endDate', name: 'End Date', type: 'date', required: false, order: 2 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: true,
              order: 3,
              options: [
                { value: 'Planning', color: 'blue' },
                { value: 'Booked', color: 'green' },
                { value: 'Completed', color: 'gray' },
              ],
            },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Trips',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [
          { fields: { title: 'Tokyo 2026', status: 'Planning', startDate: now, endDate: now }, createdBy: 'system' },
        ],
      },
      {
        slug: 'days',
        title: 'Days',
        icon: 'lucide:calendar',
        order: 1,
        schema: {
          fields: [
            { id: 'trip', name: 'Trip', type: 'text', required: true, order: 0 },
            { id: 'date', name: 'Date', type: 'date', required: true, order: 1 },
            { id: 'notes', name: 'Notes', type: 'text', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Days',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'bookings',
        title: 'Bookings',
        icon: 'lucide:ticket',
        order: 2,
        schema: {
          fields: [
            { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
            { id: 'provider', name: 'Provider', type: 'text', required: false, order: 1 },
            { id: 'date', name: 'Date', type: 'date', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Bookings',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'places',
        title: 'Places',
        icon: 'lucide:building-2',
        order: 3,
        schema: {
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            { id: 'city', name: 'City', type: 'text', required: false, order: 1 },
            { id: 'country', name: 'Country', type: 'text', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Places',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
    ],
    'family-finance': [
      {
        slug: 'accounts',
        title: 'Accounts',
        icon: 'lucide:credit-card',
        order: 0,
        schema: {
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            {
              id: 'type',
              name: 'Type',
              type: 'select',
              required: false,
              order: 1,
              options: [{ value: 'Checking', color: 'blue' }],
            },
            { id: 'balance', name: 'Balance', type: 'number', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Accounts',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'transactions',
        title: 'Transactions',
        icon: 'lucide:arrow-left-right',
        order: 1,
        schema: {
          fields: [
            { id: 'date', name: 'Date', type: 'date', required: true, order: 0 },
            { id: 'merchant', name: 'Merchant', type: 'text', required: true, order: 1 },
            { id: 'amount', name: 'Amount', type: 'number', required: true, order: 2 },
            { id: 'category', name: 'Category', type: 'text', required: false, order: 3 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Transactions',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [
          {
            fields: { date: now, merchant: 'Grocery Store', amount: 84.12, category: 'Groceries' },
            createdBy: 'system',
          },
          { fields: { date: now, merchant: 'Gas Station', amount: 52.44, category: 'Transport' }, createdBy: 'system' },
        ],
      },
      {
        slug: 'budgets',
        title: 'Budgets',
        icon: 'lucide:piggy-bank',
        order: 2,
        schema: {
          fields: [
            { id: 'category', name: 'Category', type: 'text', required: true, order: 0 },
            { id: 'amount', name: 'Amount', type: 'number', required: true, order: 1 },
            { id: 'month', name: 'Month', type: 'text', required: false, order: 2 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Budgets',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
      {
        slug: 'categories',
        title: 'Categories',
        icon: 'lucide:tags',
        order: 3,
        schema: {
          fields: [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            { id: 'group', name: 'Group', type: 'text', required: false, order: 1 },
          ],
          views: [
            {
              id: 'view_all',
              name: 'All Categories',
              type: 'table',
              filters: [],
              sorts: [],
              isDefault: true,
            },
          ],
        },
        records: [],
      },
    ],
  }

  const customTypesByAppSlug: Record<string, CustomType[]> = {
    personal: [],
    'connector-hub': [],
    'trip-planner': [],
    'family-finance': [
      {
        id: crypto.randomUUID(),
        appId: 'appId:family-finance',
        name: 'Account',
        description: 'A financial account',
        icon: 'lucide:credit-card',
        extends: 'Thing',
        createdAt: now,
        updatedAt: now,
      },
    ],
  }

  const workflowsByAppSlug: Record<string, Workflow[]> = {
    personal: [],
    'connector-hub': [
      {
        id: crypto.randomUUID(),
        appId: 'appId:connector-hub',
        name: 'Run nightly sync',
        description: 'Placeholder workflow definition',
        icon: 'lucide:workflow',
        trigger: 'scheduled',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    'trip-planner': [],
    'family-finance': [],
  }

  return {
    apps,
    collectionsByAppSlug,
    customTypesByAppSlug,
    workflowsByAppSlug,
  }
}

const ensureSettingIfMissing = async (
  instant: any,
  tx: any,
  ownerId: string,
  entityType: string,
  entityId: string,
  key: string,
  value: any,
) => {
  const settingKey = `${entityType}:${entityId}:${key}`
  const resp = await instant.queryOnce({
    settings: {
      $: {
        where: {
          settingKey,
        },
      },
    },
  })

  const existing = (resp.data as any)?.settings?.[0]
  if (existing?.id) return

  const id = crypto.randomUUID()
  await instant.transact([
    tx.settings[id].create({
      ownerId,
      settingKey,
      entityType,
      entityId,
      key,
      value,
      updatedAt: Date.now(),
    }),
  ])
}

export async function ensureDemoSeedV1(params: EnsureDemoSeedParams) {
  const { instant, tx, userId, orgId, getSetting, upsertSetting } = params

  const current = await getSetting('user', userId, 'demoSeedVersion')
  const currentVersion = typeof current === 'number' ? current : 0
  if (currentVersion >= DEMO_SEED_VERSION) return

  const { apps, collectionsByAppSlug, customTypesByAppSlug, workflowsByAppSlug } = getDemoSpecV1()

  const appIdsBySlug = new Map<string, string>()

  for (const def of apps) {
    const resp = await instant.queryOnce({
      applications: {
        $: {
          where: {
            ownerId: userId,
            orgId,
            slug: def.slug,
          },
        },
      },
    })

    const existing = (resp.data as any)?.applications?.[0]

    if (existing?.id) {
      appIdsBySlug.set(def.slug, existing.id)
      continue
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await instant.transact([
      tx.applications[id].update({
        ownerId: userId,
        orgId,
        name: def.name,
        slug: def.slug,
        icon: def.icon,
        color: def.color,
        description: def.description,
        createdAt: now,
        updatedAt: now,
      }),
      tx.organizations[orgId].link({ applications: id }),
    ])

    appIdsBySlug.set(def.slug, id)
  }

  for (const [appSlug, appId] of appIdsBySlug.entries()) {
    const collectionDefs = collectionsByAppSlug[appSlug] || []
    for (const colDef of collectionDefs) {
      const resp = await instant.queryOnce({
        collections: {
          $: {
            where: {
              appId,
              slug: colDef.slug,
            },
          },
        },
      })

      const existing = (resp.data as any)?.collections?.[0]
      let collectionId = existing?.id as string | undefined

      if (!collectionId) {
        collectionId = crypto.randomUUID()
        const now = Date.now()

        await instant.transact([
          tx.collections[collectionId].update({
            ownerId: userId,
            appId,
            parentId: null,
            title: colDef.title,
            slug: colDef.slug,
            icon: colDef.icon,
            type: 'database',
            order: colDef.order,
            isPublished: true,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          }),
          tx.applications[appId].link({ collections: collectionId }),
        ])
      }

      const schema: DatabaseSchema = {
        id: '',
        collectionId,
        fields: colDef.schema.fields,
        views: colDef.schema.views ?? createDefaultDatabaseSchema(collectionId).views,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await ensureSettingIfMissing(instant, tx, userId, 'collection', collectionId, 'schema', schema)

      const projections = createDefaultProjections(collectionId, 'database')
      await ensureSettingIfMissing(instant, tx, userId, 'collection', collectionId, 'projections', projections)

      const records: DatabaseRecord[] = (colDef.records || []).map((r) => {
        const now = Date.now()
        return {
          id: crypto.randomUUID(),
          collectionId,
          fields: r.fields,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        }
      })

      await ensureSettingIfMissing(instant, tx, userId, 'collection', collectionId, 'records', records)
    }

    const types = (customTypesByAppSlug[appSlug] || []).map((t) => ({
      ...t,
      appId,
    }))
    const workflows = (workflowsByAppSlug[appSlug] || []).map((w) => ({
      ...w,
      appId,
    }))

    await ensureSettingIfMissing(instant, tx, userId, 'app', appId, 'customTypes', types)
    await ensureSettingIfMissing(instant, tx, userId, 'app', appId, 'workflows', workflows)
  }

  await upsertSetting('user', userId, 'demoSeedVersion', DEMO_SEED_VERSION)
}

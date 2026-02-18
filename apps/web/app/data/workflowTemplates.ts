import type { WorkflowGraph } from '~/types/database'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  trigger: 'manual' | 'schedule' | 'webhook' | 'event'
  tags: string[]
  graph: WorkflowGraph
}

// ─── Shared layout helpers ────────────────────────────────────────────────────

const node = (
  id: string,
  kind: WorkflowGraph['nodes'][0]['kind'],
  label: string,
  x: number,
  y: number,
  data?: Record<string, unknown>,
): WorkflowGraph['nodes'][0] => ({ id, kind, label, position: { x, y }, ...(data ? { data } : {}) })

const edge = (
  id: string,
  source: string,
  target: string,
  label?: string,
): WorkflowGraph['edges'][0] => ({ id, source, target, ...(label ? { label } : {}) })

// ─── Templates ────────────────────────────────────────────────────────────────

export const workflowTemplates: WorkflowTemplate[] = [
  // ── 1. Research & Summarize ────────────────────────────────────────────────
  {
    id: 'tpl-research-summarize',
    name: 'Research & Summarize',
    description: 'Searches the web for a topic, synthesizes findings, and saves a structured summary to memory.',
    icon: 'lucide:search',
    trigger: 'manual',
    tags: ['research', 'agent', 'memory'],
    graph: {
      nodes: [
        node('start-1',     'start',        'Start',           300, 50),
        node('mem-read-1',  'memory-read',  'Load Context',    300, 200),
        node('agent-1',     'agent',        'Research Agent',  300, 370),
        node('tool-1',      'tool',         'Web Search',      300, 540),
        node('agent-2',     'agent',        'Summarize',       300, 710),
        node('mem-write-1', 'memory-write', 'Save Summary',    300, 880),
        node('end-1',       'end',          'Done',            300, 1030),
      ],
      edges: [
        edge('e1', 'start-1',     'mem-read-1'),
        edge('e2', 'mem-read-1',  'agent-1'),
        edge('e3', 'agent-1',     'tool-1'),
        edge('e4', 'tool-1',      'agent-2'),
        edge('e5', 'agent-2',     'mem-write-1'),
        edge('e6', 'mem-write-1', 'end-1'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.75 },
    },
  },

  // ── 2. Content Review Pipeline ────────────────────────────────────────────
  {
    id: 'tpl-content-review',
    name: 'Content Review Pipeline',
    description: 'Analyzes incoming content, applies a quality guard, then routes to approval or revision queues.',
    icon: 'lucide:clipboard-check',
    trigger: 'webhook',
    tags: ['review', 'guard', 'router'],
    graph: {
      nodes: [
        node('start-1',  'start',  'Receive Content',    350, 50),
        node('agent-1',  'agent',  'Analyze Content',    350, 220),
        node('guard-1',  'guard',  'Quality Gate',       350, 390),
        node('router-1', 'router', 'Route Decision',     350, 560),
        node('agent-2',  'agent',  'Auto-Approve',       130, 730),
        node('agent-3',  'agent',  'Request Revisions',  580, 730),
        node('note-1',   'note',   'Flag items with score < 0.7 for human review', 820, 560),
        node('end-1',    'end',    'Done',               350, 900),
      ],
      edges: [
        edge('e1', 'start-1',  'agent-1'),
        edge('e2', 'agent-1',  'guard-1'),
        edge('e3', 'guard-1',  'router-1', 'passed'),
        edge('e4', 'router-1', 'agent-2',  'approved'),
        edge('e5', 'router-1', 'agent-3',  'flagged'),
        edge('e6', 'agent-2',  'end-1'),
        edge('e7', 'agent-3',  'end-1'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.72 },
    },
  },

  // ── 3. Daily Standup Bot ──────────────────────────────────────────────────
  {
    id: 'tpl-daily-standup',
    name: 'Daily Standup Bot',
    description: 'Reads open tasks from memory, drafts a standup summary, and sends it as a notification.',
    icon: 'lucide:calendar-clock',
    trigger: 'schedule',
    tags: ['standup', 'schedule', 'notification'],
    graph: {
      nodes: [
        node('start-1',     'start',        'Schedule Trigger',  300, 50),
        node('mem-read-1',  'memory-read',  'Load Open Tasks',   300, 220),
        node('agent-1',     'agent',        'Draft Standup',     300, 390),
        node('tool-1',      'tool',         'Send Notification', 300, 560),
        node('mem-write-1', 'memory-write', 'Log Standup',       300, 730),
        node('end-1',       'end',          'Done',              300, 900),
      ],
      edges: [
        edge('e1', 'start-1',     'mem-read-1'),
        edge('e2', 'mem-read-1',  'agent-1'),
        edge('e3', 'agent-1',     'tool-1'),
        edge('e4', 'tool-1',      'mem-write-1'),
        edge('e5', 'mem-write-1', 'end-1'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.85 },
    },
  },

  // ── 4. Knowledge Q&A ──────────────────────────────────────────────────────
  {
    id: 'tpl-knowledge-qa',
    name: 'Knowledge Q&A',
    description: 'Retrieves context from memory, generates an answer, then routes by confidence to respond or escalate.',
    icon: 'lucide:message-circle-question',
    trigger: 'event',
    tags: ['qa', 'memory', 'router'],
    graph: {
      nodes: [
        node('start-1',     'start',        'User Question',       350, 50),
        node('mem-read-1',  'memory-read',  'Load Knowledge Base', 350, 220),
        node('agent-1',     'agent',        'Generate Answer',     350, 390),
        node('router-1',    'router',       'Check Confidence',    350, 560),
        node('agent-2',     'agent',        'Return Answer',       130, 730),
        node('agent-3',     'agent',        'Escalate to Human',   580, 730),
        node('mem-write-1', 'memory-write', 'Log Interaction',     350, 900),
        node('end-1',       'end',          'Done',                350, 1060),
      ],
      edges: [
        edge('e1', 'start-1',     'mem-read-1'),
        edge('e2', 'mem-read-1',  'agent-1'),
        edge('e3', 'agent-1',     'router-1'),
        edge('e4', 'router-1',    'agent-2',     'high confidence'),
        edge('e5', 'router-1',    'agent-3',     'low confidence'),
        edge('e6', 'agent-2',     'mem-write-1'),
        edge('e7', 'agent-3',     'mem-write-1'),
        edge('e8', 'mem-write-1', 'end-1'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.72 },
    },
  },
]

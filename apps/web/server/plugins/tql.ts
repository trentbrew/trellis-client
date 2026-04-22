/**
 * TQL Server Plugin
 *
 * Boots a TrellisKernel instance on the Nuxt server with:
 * - better-sqlite3 persistence at .data/trellis.db
 * - Ontology definitions for all entity types
 * - Seed data on first boot
 *
 * The kernel is stored in a module-level singleton so server API routes
 * can import it via `useTqlKernel()`.
 */

import { resolve } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import { TrellisKernel } from '@turtle.tech/tql'
import { BetterSqliteBackend } from '@turtle.tech/tql/persist/better-sqlite'
import { createWorkspaceConfig } from '../utils/tql-ontologies'

import type { WorkspaceConfig } from '@turtle.tech/tql'

// Module-level singleton — accessible from API routes via useTqlKernel()
let _kernel: TrellisKernel | null = null
let _workspaceConfig: WorkspaceConfig | null = null

export function useTqlKernel(): TrellisKernel {
  if (!_kernel) {
    throw new Error('[tql] Kernel not initialized — server plugin has not run yet')
  }
  return _kernel
}

export function useWorkspaceConfig(): WorkspaceConfig {
  if (!_workspaceConfig) {
    throw new Error('[tql] Workspace config not initialized — server plugin has not run yet')
  }
  return _workspaceConfig
}

// Mutation log ring buffer
export interface MutationLogEntry {
  timestamp: string
  action: string
  entityId?: string
  type?: string
  data?: Record<string, any>
}

const MAX_LOG_ENTRIES = 200
const _mutationLog: MutationLogEntry[] = []

export function pushMutationLog(entry: Omit<MutationLogEntry, 'timestamp'>) {
  _mutationLog.push({ ...entry, timestamp: new Date().toISOString() })
  if (_mutationLog.length > MAX_LOG_ENTRIES) {
    _mutationLog.splice(0, _mutationLog.length - MAX_LOG_ENTRIES)
  }
}

export function getMutationLog(): MutationLogEntry[] {
  return _mutationLog
}

export default defineNitroPlugin(async (nitro) => {
  const dataDir = process.env.TRELLIS_DB_PATH
    ? resolve(process.env.TRELLIS_DB_PATH, '..')
    : resolve(process.cwd(), '.data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = process.env.TRELLIS_DB_PATH || resolve(dataDir, 'trellis.db')
  const backend = new BetterSqliteBackend({ filename: dbPath })

  const kernel = new TrellisKernel({
    backend,
    autoReplay: true,
  })

  // Boot with workspace config (ontologies + projections + routes + app)
  const workspaceConfig = createWorkspaceConfig()
  _workspaceConfig = workspaceConfig
  await kernel.boot(workspaceConfig)

  // ── Seed integration definitions (idempotent — createNode replaces existing) ──
  const INTEGRATION_DEFS: Array<{ id: string; data: Record<string, any> }> = [
    {
      id: 'entity:integration-def-google-calendar',
      data: {
        type: 'integration_definition',
        title: 'Google Calendar',
        description: 'Import and sync events from Google Calendar with realtime push notifications.',
        provider: 'Google',
        category: 'data',
        authType: 'oauth',
        icon: 'simple-icons:googlecalendar',
        color: '#4285F4',
        features: ['Realtime sync', 'Push notifications', 'Entity enrichment', 'Multi-calendar'],
        docsUrl: 'https://developers.google.com/calendar/api',
        webhookSupport: true,
        pushNotificationSupport: true,
        enrichmentSupport: true,
        syncDirection: 'import',
        requiredScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        integrationStatus: 'available',
      },
    },
    {
      id: 'entity:integration-def-gmail',
      data: {
        type: 'integration_definition',
        title: 'Gmail',
        description: 'Read, send, and link emails to workspace entities. Threads become part of the graph.',
        provider: 'Google',
        category: 'communication',
        authType: 'oauth',
        icon: 'simple-icons:gmail',
        color: '#EA4335',
        features: ['Read inbox', 'Send + reply', 'Label management', 'Link emails to entities'],
        docsUrl: 'https://developers.google.com/gmail/api',
        webhookSupport: true,
        pushNotificationSupport: true,
        enrichmentSupport: true,
        syncDirection: 'bidirectional',
        requiredScopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.labels',
        ],
        integrationStatus: 'available',
      },
    },
    {
      id: 'entity:integration-def-notion',
      data: {
        type: 'integration_definition',
        title: 'Notion',
        description: 'Connect with Notion databases and pages.',
        provider: 'Notion',
        category: 'data',
        authType: 'oauth',
        icon: 'simple-icons:notion',
        features: ['Import databases', 'Sync pages', 'Block support'],
        docsUrl: 'https://developers.notion.com/',
        syncDirection: 'import',
        integrationStatus: 'available',
      },
    },
    {
      id: 'entity:integration-def-slack',
      data: {
        type: 'integration_definition',
        title: 'Slack',
        description: 'Send notifications and updates to Slack.',
        provider: 'Slack',
        category: 'communication',
        authType: 'oauth',
        icon: 'simple-icons:slack',
        features: ['Notifications', 'Slash commands', 'Interactive messages'],
        docsUrl: 'https://api.slack.com/',
        webhookSupport: true,
        syncDirection: 'bidirectional',
        integrationStatus: 'available',
      },
    },
    {
      id: 'entity:integration-def-github',
      data: {
        type: 'integration_definition',
        title: 'GitHub',
        description:
          'Sync repositories, issues, and pull requests into the graph. Link GitHub activity to any workspace entity.',
        provider: 'GitHub',
        category: 'data',
        authType: 'oauth',
        icon: 'simple-icons:github',
        color: '#24292e',
        features: [
          'Sync repositories',
          'Track issues + pull requests',
          'Link activity to entities',
          'Label + milestone metadata',
        ],
        docsUrl: 'https://docs.github.com/en/rest',
        webhookSupport: true,
        pushNotificationSupport: false,
        enrichmentSupport: false,
        syncDirection: 'import',
        requiredScopes: ['repo', 'read:user', 'read:org'],
        integrationStatus: 'available',
      },
    },
  ]

  for (const def of INTEGRATION_DEFS) {
    await kernel.createNode(def.id, def.data, 'entity')
  }
  console.log(`[tql] Seeded ${INTEGRATION_DEFS.length} integration definitions`)

  // Store in module singleton
  _kernel = kernel

  // Clean up on shutdown
  nitro.hooks.hook('close', () => {
    kernel.close()
    _kernel = null
    console.log('[tql] Kernel closed')
  })

  console.log('[tql] TrellisKernel ready')
})

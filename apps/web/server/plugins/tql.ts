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
import {
  FOUNDER_FACILITY_ID,
  FOUNDER_LAB_ZONE_ID,
  FOUNDER_LOBBY_ZONE_ID,
  FOUNDER_WORKSHOP_ZONE_ID,
  FOUNDER_SHOWROOM_ZONE_ID,
  FOUNDER_VAULT_ZONE_ID,
} from '../utils/tql-events'
import { initZoneGuard } from '../utils/zone-guard'

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
  /** Who performed the mutation (matches MutationEvent.agentId) */
  agentId?: string
  /** Campus zone where the mutation originated (slice 0.5) */
  zoneId?: string
  /** Campus facility containing the zone (slice 0.5) */
  facilityId?: string
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

  // ── Seed Campus substrate: founder Agent + Facility + zones (Phase 0) ──
  // Slice 0.2 of campus-substrate-c4s7b2.md. Idempotent — kernel.createNode
  // replaces existing entities, so re-running on HMR is safe. All entities
  // live in the shared `entity` namespace per the app's polymorphic model.
  //
  // Zone = capability grant. The JSON-encoded `grants` field declares which
  // actions are allowed in which zone. Phase 0 stores these grants but does
  // not yet enforce them — the advisory middleware lands in slice 0.4.
  const FOUNDER_AGENT_ID = 'entity:founder'
  const ZONE_IDS = {
    lab: FOUNDER_LAB_ZONE_ID,
    lobby: FOUNDER_LOBBY_ZONE_ID,
    workshop: FOUNDER_WORKSHOP_ZONE_ID,
    showroom: FOUNDER_SHOWROOM_ZONE_ID,
    vault: FOUNDER_VAULT_ZONE_ID,
  }
  const ZONE_GRANTS: Record<string, Array<Record<string, any>>> = {
    lab: [{ action: 'ALL', scope: { ownerOnly: true } }],
    lobby: [
      { action: 'READ', scope: { public: true } },
      { action: 'REQUEST_ACCESS', scope: {} },
    ],
    workshop: [{ action: 'ALL', scope: { membersOnly: true } }],
    showroom: [
      { action: 'READ', scope: { public: true } },
      { action: 'WRITE', scope: { membersOnly: true, requiresPublication: true } },
    ],
    vault: [{ action: 'ALL', scope: { ownerOnly: true, requiresSecondFactor: true } }],
  }

  // 1. Founder Agent (the solo dev)
  await kernel.createNode(
    FOUNDER_AGENT_ID,
    {
      type: 'agent',
      title: 'Founder',
      description: 'The solo dev — the human operator of this Trellis instance.',
      role: 'founder',
      agentStatus: 'active',
      provider: 'human',
      homeFacility: FOUNDER_FACILITY_ID,
      invitedToZones: Object.values(ZONE_IDS),
    },
    'entity',
  )

  // 2. Founder Facility (root of the Campus)
  await kernel.createNode(
    FOUNDER_FACILITY_ID,
    {
      type: 'facility',
      title: 'Founder',
      description: 'Root Facility for the solo dev. Houses all of their zones.',
      facilityKind: 'root',
      ownerAgent: FOUNDER_AGENT_ID,
    },
    'entity',
  )

  // 3. Default zones — Lab, Lobby, Workshop, Showroom, Vault
  const ZONE_DEFS: Array<{
    id: string
    kind: keyof typeof ZONE_GRANTS
    title: string
    description: string
    publicRead: boolean
  }> = [
    {
      id: ZONE_IDS.lab,
      kind: 'lab',
      title: 'Lab',
      description: "The founder's private workspace. Owner-only access.",
      publicRead: false,
    },
    {
      id: ZONE_IDS.lobby,
      kind: 'lobby',
      title: 'Lobby',
      description: 'Public front door. Notifications and access requests route here.',
      publicRead: true,
    },
    {
      id: ZONE_IDS.workshop,
      kind: 'workshop',
      title: 'Workshop',
      description: 'Shared workspace for collaborating with invited agents.',
      publicRead: false,
    },
    {
      id: ZONE_IDS.showroom,
      kind: 'showroom',
      title: 'Showroom',
      description: 'Public portfolio of shipped artifacts and pages.',
      publicRead: true,
    },
    {
      id: ZONE_IDS.vault,
      kind: 'vault',
      title: 'Vault',
      description: 'Irreversible-op zone. Holds credentials and requires second-factor attestation.',
      publicRead: false,
    },
  ]

  for (const zone of ZONE_DEFS) {
    await kernel.createNode(
      zone.id,
      {
        type: 'zone',
        title: zone.title,
        description: zone.description,
        zoneKind: zone.kind,
        facilityId: FOUNDER_FACILITY_ID,
        grants: JSON.stringify(ZONE_GRANTS[zone.kind]),
        memberAgents: [FOUNDER_AGENT_ID],
        publicRead: zone.publicRead,
      },
      'entity',
    )
  }

  console.log(`[tql] Seeded Campus substrate: ${FOUNDER_AGENT_ID} + ${FOUNDER_FACILITY_ID} + ${ZONE_DEFS.length} zones`)

  // ── Advisory zone guard (slice 0.4) ─────────────────────────────────
  // Subscribes to the mutation event bus and logs whether each mutation
  // would be allowed under strict zone grant enforcement. Does NOT reject
  // mutations in Phase 0 — pure telemetry to validate the grant model.
  initZoneGuard(kernel)

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

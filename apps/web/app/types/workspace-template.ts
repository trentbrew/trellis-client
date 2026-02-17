/**
 * Workspace Template Types
 *
 * Portable template format that bundles ontologies + sidebar tree + pages + seed data.
 * Used by the Ontology Marketplace to provision fully-configured Worlds.
 *
 * A WorkspaceTemplate extends the existing OntologyPackage with:
 * - sidebarTree: defines the sidebar structure for /workspace
 * - pages: optional pre-built pages (browse, dashboard, etc.)
 * - seedData: optional starter entities
 */

import type { SidebarNodeSeed } from '~/composables/useSidebarTree'
import type {
  OntologyPackage,
  OntologyEntityType,
  OntologyView,
  OntologyWidget,
  OntologyCategory,
} from '~/composables/useOntologyMarketplace'

// ── WorkspaceTemplate ──────────────────────────────────────────────────

export interface WorkspaceTemplate extends OntologyPackage {
  /** Sidebar tree structure seeded into the new World */
  sidebarTree: SidebarNodeSeed[]

  /** Optional pre-built pages for the template */
  pages?: PageSeed[]

  /** Optional starter entities to populate the world */
  seedData?: EntitySeed[]

  /** Template color theme (used in marketplace UI) */
  color?: string

  /** Template tier: 'official' = Trellis team, 'community' = user-submitted */
  tier?: 'official' | 'community'
}

// ── Page Seed ──────────────────────────────────────────────────────────

export interface PageSeed {
  slug: string
  title: string
  icon?: string
  content?: string
  /** Entity type this page browses (creates a browse page) */
  entityType?: string
  /** Projection type for browse pages */
  projection?: string
}

// ── Entity Seed ────────────────────────────────────────────────────────

export interface EntitySeed {
  type: string
  title: string
  data?: Record<string, any>
}

// ── Install Options ────────────────────────────────────────────────────

export type InstallMode = 'new-world' | 'merge'

export interface InstallOptions {
  mode: InstallMode
  worldName?: string
  /** If merging, which world to merge into */
  targetWorldId?: string
}

// ── Install Result ─────────────────────────────────────────────────────

export interface InstallResult {
  success: boolean
  worldId?: string
  worldName?: string
  error?: string
  /** Number of ontologies created */
  ontologiesCreated: number
  /** Number of sidebar nodes seeded */
  sidebarNodesSeeded: number
  /** Number of entities seeded */
  entitiesSeeded: number
}

// ── Re-exports for convenience ─────────────────────────────────────────

export type {
  OntologyPackage,
  OntologyEntityType,
  OntologyView,
  OntologyWidget,
  OntologyCategory,
  SidebarNodeSeed,
}

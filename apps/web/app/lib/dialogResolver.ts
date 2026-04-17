/**
 * Dialog Resolver — centralized entity dialog component resolution.
 *
 * Maps entity type → Vue dialog component. DynamicEntityDialog is the
 * universal default. System types that need custom UX register explicit
 * overrides via DIALOG_OVERRIDES.
 *
 * Why overrides instead of switch statements:
 * - Single source of truth for dialog routing
 * - Easy to add/remove overrides without touching the host
 * - DynamicEntityDialog covers all types by default
 * - Overrides are opt-in, not opt-out
 */

import type { Component } from 'vue'
import type { EntityType } from '~/types/entity'
import EntityDialog from '~/components/dialogs/EntityDialog.vue'
import PersonDialog from '~/components/dialogs/PersonDialog.vue'
import OrganizationDialog from '~/components/dialogs/OrganizationDialog.vue'
import ProjectDialog from '~/components/dialogs/ProjectDialog.vue'
import FileDialog from '~/components/dialogs/FileDialog.vue'
import SlideDeckDialog from '~/components/dialogs/SlideDeckDialog.vue'
import DynamicEntityDialog from '~/components/dialogs/DynamicEntityDialog.vue'

/**
 * Explicit dialog component overrides for system types.
 * Types not listed here use DynamicEntityDialog.
 */
const DIALOG_OVERRIDES: Partial<Record<EntityType, Component>> = {
  // Temporal types with specialized content panels → EntityDialog
  task: EntityDialog,
  event: EntityDialog,

  // Document types with specialized content panels → EntityDialog
  note: EntityDialog,
  bookmark: EntityDialog,
  diagram: EntityDialog,
  email: EntityDialog,

  // Slide deck — full presentation view
  slide_deck: SlideDeckDialog,

  // Actor types — dedicated PersonDialog
  person: PersonDialog,
  contact: PersonDialog,
  vendor: PersonDialog,

  // Organization — dedicated OrganizationDialog
  organization: OrganizationDialog,

  // Container types — dedicated ProjectDialog
  project: ProjectDialog,
  folder: ProjectDialog,
  collection: ProjectDialog,
  goal: ProjectDialog,

  // File — dedicated FileDialog
  file: FileDialog,

  // trip, payment, appointment, reminder, deadline, milestone, sprint,
  // budget, page, template — no specialized panel; DynamicEntityDialog handles them
}

export interface ResolvedDialog {
  /** The dialog component to render */
  component: Component
  /** Whether this component needs :type-config prop (DynamicEntityDialog only) */
  needsTypeConfig: boolean
  /** Whether this is using the default DynamicEntityDialog or an override */
  isOverride: boolean
}

/**
 * Resolve entity type to dialog component.
 *
 * @param entityType - The entity type slug
 * @returns The resolved dialog component and metadata
 */
export function resolveDialog(entityType: string): ResolvedDialog {
  const override = DIALOG_OVERRIDES[entityType as EntityType]
  if (override) {
    return {
      component: override,
      needsTypeConfig: false,
      isOverride: true,
    }
  }

  return {
    component: DynamicEntityDialog as Component,
    needsTypeConfig: true,
    isOverride: false,
  }
}

/**
 * Check whether a type has a specialized dialog override.
 */
export function hasDialogOverride(entityType: string): boolean {
  return (entityType as EntityType) in DIALOG_OVERRIDES
}

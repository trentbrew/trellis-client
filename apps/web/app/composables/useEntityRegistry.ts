/**
 * Composable for runtime entity registry access.
 *
 * Provides reactive lookups for entity type → class, projections,
 * dialog shell, panel components, and UI options.
 *
 * Usage:
 *   const { resolve, classConfig, projections, panels } = useEntityRegistry('task')
 *   // or dynamically:
 *   const { resolve } = useEntityRegistry(entityTypeRef)
 */

import type {
  EntityType,
  EntityClass,
  EntityTypeConfig,
  EntityClassConfig,
  EntityPanelConfig,
} from '~/types/entity'
import { getEntityClass } from '~/types/entity'
import type { ProjectionType } from '~/types/database'
import {
  getEntityTypeConfig,
  getEntityClassForType,
  getProjectionsForType,
  getPanelsForType,
  getDialogShellForType,
  getTypesForClass,
  buildEntityTypeOptions,
  buildGroupedEntityTypeOptions,
} from '~/config/entityRegistry'

export interface UseEntityRegistryReturn {
  /** Full type-level config (reactive if input is reactive) */
  typeConfig: ComputedRef<EntityTypeConfig>
  /** Class-level config for this type's class */
  classConfig: ComputedRef<EntityClassConfig>
  /** The entity class ('temporal' | 'document' | 'actor' | 'container') */
  entityClass: ComputedRef<EntityClass>
  /** Allowed projection types for this entity type */
  projections: ComputedRef<ProjectionType[]>
  /** Panel component names for this entity type */
  panels: ComputedRef<EntityPanelConfig>
  /** Dialog shell component name */
  dialogShell: ComputedRef<string>
  /** Human-readable label */
  label: ComputedRef<string>
  /** Plural label */
  labelPlural: ComputedRef<string>
  /** Icon name */
  icon: ComputedRef<string>
  /** Color token */
  color: ComputedRef<string>
  /** All types in the same class */
  siblingTypes: ComputedRef<EntityTypeConfig[]>
  /** Build picker options (optionally filtered) */
  buildOptions: typeof buildEntityTypeOptions
  /** Build grouped picker options */
  buildGroupedOptions: typeof buildGroupedEntityTypeOptions
}

export function useEntityRegistry(
  entityType: MaybeRef<EntityType> | MaybeRefOrGetter<EntityType>,
): UseEntityRegistryReturn {
  const resolvedType = computed(() => toValue(entityType))

  const typeConfig = computed(() => getEntityTypeConfig(resolvedType.value))
  const classConfig = computed(() => getEntityClassForType(resolvedType.value))
  const entityClass = computed(() => typeConfig.value.class)
  const projections = computed(() => getProjectionsForType(resolvedType.value))
  const panels = computed(() => getPanelsForType(resolvedType.value))
  const dialogShell = computed(() => getDialogShellForType(resolvedType.value))
  const label = computed(() => typeConfig.value.label)
  const labelPlural = computed(() => typeConfig.value.labelPlural)
  const icon = computed(() => typeConfig.value.icon)
  const color = computed(() => typeConfig.value.color)
  const siblingTypes = computed(() => getTypesForClass(entityClass.value))

  return {
    typeConfig,
    classConfig,
    entityClass,
    projections,
    panels,
    dialogShell,
    label,
    labelPlural,
    icon,
    color,
    siblingTypes,
    buildOptions: buildEntityTypeOptions,
    buildGroupedOptions: buildGroupedEntityTypeOptions,
  }
}

/**
 * Lightweight non-reactive lookup (for one-off resolutions outside of setup).
 */
export function resolveEntity(type: EntityType) {
  return {
    typeConfig: getEntityTypeConfig(type),
    classConfig: getEntityClassForType(type),
    entityClass: getEntityClass(type),
    projections: getProjectionsForType(type),
    panels: getPanelsForType(type),
    dialogShell: getDialogShellForType(type),
  }
}

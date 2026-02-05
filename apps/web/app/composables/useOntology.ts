/**
 * Composable for accessing the ontology registry
 *
 * Provides reactive access to types, fields, workflows, and terminology
 * from the loaded ontologies (core + any imported verticals).
 */

import {
  createOntologyRegistry,
  getType,
  getField,
  getSubtypes,
  getTerminology,
  hasVertical,
  getAvailableVerticals,
  type OntologyRegistry,
  type OntologyNode,
  type LoadedOntology,
} from '~/config/ontologies'

// Global registry instance (created once)
let globalRegistry: OntologyRegistry | null = null

/**
 * Get or create the ontology registry
 */
function getRegistry(verticals: string[] = []): OntologyRegistry {
  if (!globalRegistry) {
    globalRegistry = createOntologyRegistry(verticals)
  }
  return globalRegistry
}

/**
 * Reset the registry (useful for testing or hot-reload)
 */
export function resetOntologyRegistry(): void {
  globalRegistry = null
}

/**
 * Main composable for ontology access
 */
export function useOntology(options: { verticals?: string[] } = {}) {
  // Get the current app's imported ontologies from config
  const { currentApp } = useInstantData()

  // Determine which verticals to load
  const activeVerticals = computed<string[]>(() => {
    // Priority: explicit options > app config > default (none)
    if (options.verticals?.length) {
      return options.verticals
    }

    // Check app's ontologies field (if stored in app config)
    const appOntologies = currentApp.value?.ontologies as string[] | undefined
    if (appOntologies?.length) {
      return appOntologies
    }

    // Default: load ECMS for backward compatibility during transition
    return ['ecms']
  })

  // Create/get the registry
  const registry = computed(() => getRegistry(activeVerticals.value))

  // Reactive type lookup
  const getTypeById = (typeId: string): OntologyNode | undefined => {
    return getType(registry.value, typeId)
  }

  // Reactive field lookup
  const getFieldById = (fieldId: string): OntologyNode | undefined => {
    return getField(registry.value, fieldId)
  }

  // Get all types
  const allTypes = computed(() => {
    return Array.from(registry.value.merged.types.values())
  })

  // Get all fields
  const allFields = computed(() => {
    return Array.from(registry.value.merged.fields.values())
  })

  // Get all workflows
  const allWorkflows = computed(() => {
    return Array.from(registry.value.merged.workflows.values())
  })

  // Get subtypes of a base type
  const getSubtypesOf = (baseTypeId: string): OntologyNode[] => {
    return getSubtypes(registry.value, baseTypeId)
  }

  // Get current terminology config
  const terminology = computed(() => {
    return getTerminology(registry.value)
  })

  // Check if a vertical is active
  const isVerticalActive = (verticalId: string): boolean => {
    return hasVertical(registry.value, verticalId)
  }

  // Get loaded vertical by ID
  const getVertical = (verticalId: string): LoadedOntology | undefined => {
    return registry.value.verticals.get(verticalId)
  }

  // Get core ontology
  const coreOntology = computed(() => registry.value.core)

  // Terminology helpers
  const groupingMechanism = computed(() => {
    const term = terminology.value
    return (term?.grouping as string) || 'tag'
  })

  const contextPath = computed(() => {
    const term = terminology.value
    return (term?.context as string[]) || ['workspace', 'app']
  })

  const entityNoun = computed(() => {
    const term = terminology.value
    return (term?.entityNoun as string) || 'record'
  })

  const containerNoun = computed(() => {
    const term = terminology.value
    return (term?.containerNoun as string) || 'collection'
  })

  // Check if using folders (ECMS) or tags (generic)
  const usesFolders = computed(() => groupingMechanism.value === 'folder')
  const usesTags = computed(() => groupingMechanism.value === 'tag')

  return {
    // Registry access
    registry,
    coreOntology,
    activeVerticals,

    // Type operations
    getTypeById,
    allTypes,
    getSubtypesOf,

    // Field operations
    getFieldById,
    allFields,

    // Workflow operations
    allWorkflows,

    // Vertical operations
    isVerticalActive,
    getVertical,
    availableVerticals: getAvailableVerticals(),

    // Terminology
    terminology,
    groupingMechanism,
    contextPath,
    entityNoun,
    containerNoun,
    usesFolders,
    usesTags,
  }
}

/**
 * Helper to get type icon
 */
export function getTypeIcon(typeNode: OntologyNode | undefined): string {
  return typeNode?.icon || 'lucide:box'
}

/**
 * Helper to get type component
 */
export function getTypeComponent(typeNode: OntologyNode | undefined): string {
  return typeNode?.component || 'ui:GenericCard'
}

/**
 * Helper to get type projection types
 */
export function getTypeProjections(typeNode: OntologyNode | undefined): string[] {
  return typeNode?.projectionTypes || ['table', 'list']
}

/**
 * Helper to resolve field options
 */
export function getFieldOptions(
  fieldNode: OntologyNode | undefined,
): Array<{ value: string; label: string; color?: string; icon?: string }> {
  return fieldNode?.options || []
}

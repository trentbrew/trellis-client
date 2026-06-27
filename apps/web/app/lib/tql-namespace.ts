/**
 * Entity namespace constants (legacy module path).
 *
 * @deprecated Import from `~/lib/entity-namespace` instead. Kept for backward
 * compatibility during the TQL→Trellis rename (ADR-001, TRL-2).
 */

export const ENTITY_NAMESPACE = 'entity'

/** Build a fully-qualified TQL entity ID: `entity:<id>` */
export const entityId = (id: string) => `${ENTITY_NAMESPACE}:${id}`

/** Strip the namespace prefix from a TQL entity ID */
export const stripNamespace = (fullId: string) => fullId.replace(`${ENTITY_NAMESPACE}:`, '')

/** Build a FIND query prefix: `FIND entity AS <alias>` */
export const entityQuery = (alias: string) => `FIND ${ENTITY_NAMESPACE} AS ${alias}`

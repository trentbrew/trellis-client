/**
 * TQL entity namespace constants.
 *
 * All entities in the TQL graph share the `entity` storage namespace.
 * This module centralizes that string so it only exists in one place.
 */

export const ENTITY_NAMESPACE = 'entity'

/** Build a fully-qualified TQL entity ID: `entity:<id>` */
export const entityId = (id: string) => `${ENTITY_NAMESPACE}:${id}`

/** Strip the namespace prefix from a TQL entity ID */
export const stripNamespace = (fullId: string) => fullId.replace(`${ENTITY_NAMESPACE}:`, '')

/** Build a FIND query prefix: `FIND entity AS <alias>` */
export const entityQuery = (alias: string) => `FIND ${ENTITY_NAMESPACE} AS ${alias}`

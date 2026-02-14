/**
 * TQL entity namespace constants.
 *
 * All entities in the TQL graph share the `calendaritem` storage namespace
 * for historical reasons. This module centralizes that string so it only
 * exists in one place — if the namespace ever changes, update it here.
 */

export const ENTITY_NAMESPACE = 'calendaritem'

/** Build a fully-qualified TQL entity ID: `calendaritem:<id>` */
export const entityId = (id: string) => `${ENTITY_NAMESPACE}:${id}`

/** Strip the namespace prefix from a TQL entity ID */
export const stripNamespace = (fullId: string) => fullId.replace(`${ENTITY_NAMESPACE}:`, '')

/** Build a FIND query prefix: `FIND calendaritem AS <alias>` */
export const entityQuery = (alias: string) => `FIND ${ENTITY_NAMESPACE} AS ${alias}`

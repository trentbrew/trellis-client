/**
 * Trellis entity namespace constants.
 *
 * All entities in the graph share the `entity` storage namespace.
 * Prefer importing from this module over `tql-namespace.ts`.
 */

export {
  ENTITY_NAMESPACE,
  entityId,
  stripNamespace,
  entityQuery,
} from './tql-namespace'

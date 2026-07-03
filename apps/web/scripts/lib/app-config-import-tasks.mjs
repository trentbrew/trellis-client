/**
 * Pure helpers for kernel → sidecar app config import (ADR-002 TRL-20c).
 */

/** @param {string} schemaId */
export function ontologySlugFromSchemaId(schemaId) {
  return schemaId.replace(/^trellis:schema\//, '').replace(/[:/]/g, '-')
}

/**
 * @param {string} schemaId
 * @param {Record<string, unknown>} schema
 */
export function ontologyImportTask(schemaId, schema) {
  const slug = ontologySlugFromSchemaId(schemaId)
  return {
    type: 'AppSchema',
    id: `ontology:${slug}`,
    attributes: {
      title: schema.label ?? schemaId,
      schemaId,
      configJson: JSON.stringify(schema),
    },
  }
}

/**
 * @param {Record<string, unknown>} config
 */
export function buildAppConfigImportTasks(config) {
  const tasks = []

  for (const [routeId, route] of Object.entries(config.routes ?? {})) {
    tasks.push({
      type: 'AppRoute',
      id: routeId,
      attributes: {
        title: route.label ?? routeId,
        configJson: JSON.stringify(route),
      },
    })
  }

  for (const [schemaId, schema] of Object.entries(config.ontologies ?? {})) {
    tasks.push(ontologyImportTask(schemaId, schema))
  }

  for (const [projectionId, projection] of Object.entries(config.projections ?? {})) {
    const slug = projectionId.replace(/^trellis:projection\//, '').replace(/\//g, '-')
    tasks.push({
      type: 'AppProjection',
      id: `projection:${slug}`,
      attributes: {
        title: projection.name ?? projectionId,
        projectionId,
        configJson: JSON.stringify(projection),
      },
    })
  }

  for (const [viewId, view] of Object.entries(config.projectionViews ?? {})) {
    const projectionType = view.projectionType ?? viewId.replace(/^projection-view:/, '')
    tasks.push({
      type: 'AppProjectionView',
      id: viewId.startsWith('projection-view:') ? viewId : `projection-view:${projectionType}`,
      attributes: {
        title: view.label ?? projectionType,
        projectionType,
        configJson: JSON.stringify(view),
      },
    })
  }

  return tasks
}

/** @param {Record<string, unknown>} config */
export function kernelOntologyKeys(config) {
  return new Set(Object.keys(config.ontologies ?? {}))
}

/**
 * @param {unknown[]} entities
 * @returns {Set<string>}
 */
export function sidecarSchemaIdSet(entities) {
  const ids = new Set()
  for (const row of entities) {
    if (!row || typeof row !== 'object') continue
    const record = /** @type {Record<string, unknown>} */ (row)
    const attrs = record.attributes && typeof record.attributes === 'object'
      ? /** @type {Record<string, unknown>} */ (record.attributes)
      : record
    const schemaId = attrs.schemaId
    if (typeof schemaId === 'string' && schemaId.trim()) {
      ids.add(schemaId)
    }
  }
  return ids
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown[]} sidecarEntities
 */
export function compareOntologyParity(config, sidecarEntities) {
  const expected = kernelOntologyKeys(config)
  const actual = sidecarSchemaIdSet(sidecarEntities)

  const missing = [...expected].filter((key) => !actual.has(key))
  const extra = [...actual].filter((key) => !expected.has(key))

  return {
    ok: missing.length === 0 && extra.length === 0 && expected.size === actual.size,
    missing,
    extra,
    expectedCount: expected.size,
    actualCount: actual.size,
  }
}

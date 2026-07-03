/**
 * List AppSchema entities from the trellis sidecar (direct or Nuxt proxy).
 */

/**
 * @param {unknown} json
 */
function normalizeEntityRows(json) {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const record = /** @type {Record<string, unknown>} */ (json)
    if (Array.isArray(record.data)) return record.data
  }
  return []
}

/**
 * @param {Record<string, string>} headers
 * @param {string} targetBase
 */
export async function fetchSidecarSchemas(targetBase, headers) {
  const typeQuery = `${targetBase}/entities?type=AppSchema&limit=500`
  let res = await fetch(typeQuery, { headers, cache: 'no-store' })

  if (!res.ok) {
    const fallbackUrl = `${targetBase}/entities?limit=500`
    res = await fetch(fallbackUrl, { headers, cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`Sidecar entities list failed: ${res.status} ${await res.text()}`)
    }
    const rows = normalizeEntityRows(await res.json())
    return rows.filter((row) => {
      if (!row || typeof row !== 'object') return false
      const record = /** @type {Record<string, unknown>} */ (row)
      return record.type === 'AppSchema'
    })
  }

  return normalizeEntityRows(await res.json())
}

/**
 * Entity extraction endpoint.
 *
 * GET /api/extract-entities?url=https://example.com
 *
 * Fetches the target URL and extracts structured entity suggestions
 * (people, organizations) and tags from HTML meta, JSON-LD, oEmbed,
 * and byline patterns. Used by BookmarkContent.vue to suggest
 * references when saving a bookmark.
 */

interface EntitySuggestion {
  name: string
  type: 'person' | 'organization'
  confidence: 'high' | 'medium' | 'low'
  source: string
  meta?: { url?: string; role?: string; description?: string }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string | undefined

  if (!targetUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ?url parameter' })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  const entities: EntitySuggestion[] = []
  const tags: string[] = []

  const host = parsed.hostname.replace(/^www\./, '')

  // ── oEmbed extraction for known services ────────────────────────────
  const oembedEntities = await extractFromOEmbed(targetUrl, host)
  entities.push(...oembedEntities)

  // ── HTML extraction ─────────────────────────────────────────────────
  const html = await fetchHTML(targetUrl)
  if (html) {
    entities.push(...extractFromJsonLd(html))
    entities.push(...extractFromMetaTags(html))
    entities.push(...extractFromBylines(html))
    tags.push(...extractTags(html))
  }

  // ── Deduplicate ─────────────────────────────────────────────────────
  const deduped = deduplicateEntities(entities)

  return { entities: deduped, tags: [...new Set(tags)] }
})

// ═══════════════════════════════════════════════════════════════════════
// HTML Fetcher
// ═══════════════════════════════════════════════════════════════════════

async function fetchHTML(targetUrl: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrellisBot/1.0; +https://trellis.app)',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)
    if (!res.ok) return ''

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let html = ''
    const MAX_BYTES = 100_000

    if (reader) {
      let bytesRead = 0
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        bytesRead += value.byteLength
      }
      reader.cancel().catch(() => {})
    } else {
      html = await res.text()
    }

    return html
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════════════
// JSON-LD Extraction
// ═══════════════════════════════════════════════════════════════════════

function extractFromJsonLd(html: string): EntitySuggestion[] {
  const results: EntitySuggestion[] = []
  const re = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      processJsonLdNode(data, results)
    } catch {
      // malformed JSON-LD, skip
    }
  }

  return results
}

function processJsonLdNode(node: any, results: EntitySuggestion[]): void {
  if (!node || typeof node !== 'object') return

  // Handle @graph arrays
  if (Array.isArray(node['@graph'])) {
    for (const item of node['@graph']) {
      processJsonLdNode(item, results)
    }
    return
  }

  // Handle arrays (e.g. multiple JSON-LD objects)
  if (Array.isArray(node)) {
    for (const item of node) processJsonLdNode(item, results)
    return
  }

  const type = node['@type']

  // Direct Person or Organization nodes
  if (type === 'Person' || type === 'Organization') {
    const name = node.name || node.givenName
    if (name && typeof name === 'string') {
      results.push({
        name: name.trim(),
        type: type === 'Person' ? 'person' : 'organization',
        confidence: 'high',
        source: 'json-ld',
        meta: {
          url: node.url || node.sameAs || undefined,
          role: node.jobTitle || undefined,
          description: node.description || undefined,
        },
      })
    }
  }

  // Extract author/publisher from Article, WebPage, BlogPosting, etc.
  for (const field of ['author', 'publisher', 'creator', 'contributor']) {
    if (node[field]) {
      const authors = Array.isArray(node[field]) ? node[field] : [node[field]]
      for (const author of authors) {
        if (typeof author === 'string') {
          results.push({
            name: author.trim(),
            type: 'person',
            confidence: 'high',
            source: 'json-ld',
          })
        } else if (author && typeof author === 'object') {
          const authorType = author['@type']
          const name = author.name || author.givenName
          if (name && typeof name === 'string') {
            results.push({
              name: name.trim(),
              type: authorType === 'Organization' ? 'organization' : 'person',
              confidence: 'high',
              source: 'json-ld',
              meta: {
                url: author.url || author.sameAs || undefined,
                role: author.jobTitle || undefined,
                description: author.description || undefined,
              },
            })
          }
        }
      }
    }
  }

  // Extract mentions and about
  for (const field of ['mentions', 'about']) {
    if (node[field]) {
      const items = Array.isArray(node[field]) ? node[field] : [node[field]]
      for (const item of items) {
        if (item && typeof item === 'object') {
          const itemType = item['@type']
          if (itemType === 'Person' || itemType === 'Organization') {
            const name = item.name || item.givenName
            if (name && typeof name === 'string') {
              results.push({
                name: name.trim(),
                type: itemType === 'Person' ? 'person' : 'organization',
                confidence: 'medium',
                source: 'json-ld',
                meta: {
                  url: item.url || item.sameAs || undefined,
                  description: item.description || undefined,
                },
              })
            }
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Meta Tag Extraction
// ═══════════════════════════════════════════════════════════════════════

function extractFromMetaTags(html: string): EntitySuggestion[] {
  const results: EntitySuggestion[] = []

  // Author meta tags
  const authorPatterns = [
    /article:author/i,
    /^author$/i,
    /citation_author/i,
    /dc\.creator/i,
  ]

  for (const pattern of authorPatterns) {
    // property/name="..." content="..."
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["']`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re1.exec(html)) !== null) {
      if (pattern.test(m[1])) {
        const name = decodeHTMLEntities(m[2]).trim()
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: 'person', confidence: 'medium', source: 'meta-tag' })
        }
      }
    }
    // Reversed: content="..." property/name="..."
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']([^"']+)["']`, 'gi')
    while ((m = re2.exec(html)) !== null) {
      if (pattern.test(m[2])) {
        const name = decodeHTMLEntities(m[1]).trim()
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: 'person', confidence: 'medium', source: 'meta-tag' })
        }
      }
    }
  }

  // Publisher meta tags
  const publisherPatterns = [/article:publisher/i, /og:site_name/i, /publisher/i]
  for (const pattern of publisherPatterns) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["']`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re1.exec(html)) !== null) {
      if (pattern.test(m[1])) {
        const name = decodeHTMLEntities(m[2]).trim()
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: 'organization', confidence: 'medium', source: 'meta-tag' })
        }
      }
    }
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']([^"']+)["']`, 'gi')
    while ((m = re2.exec(html)) !== null) {
      if (pattern.test(m[2])) {
        const name = decodeHTMLEntities(m[1]).trim()
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: 'organization', confidence: 'medium', source: 'meta-tag' })
        }
      }
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════
// Byline / Author Element Extraction
// ═══════════════════════════════════════════════════════════════════════

function extractFromBylines(html: string): EntitySuggestion[] {
  const results: EntitySuggestion[] = []

  // <* class="...author...">text</*>
  const authorClassRe = /<[a-z][a-z0-9]*[^>]+class=["'][^"']*\bauthor\b[^"']*["'][^>]*>([^<]{2,80})</ig
  let m: RegExpExecArray | null
  while ((m = authorClassRe.exec(html)) !== null) {
    const name = stripTags(decodeHTMLEntities(m[1])).trim()
    if (name && name.length > 1 && name.length < 80 && !looksLikeUrl(name) && !looksLikeMarkup(name)) {
      results.push({ name, type: 'person', confidence: 'low', source: 'byline' })
    }
  }

  // <a rel="author">text</a>
  const relAuthorRe = /<a[^>]+rel=["']author["'][^>]*>([^<]{2,80})<\/a>/gi
  while ((m = relAuthorRe.exec(html)) !== null) {
    const name = stripTags(decodeHTMLEntities(m[1])).trim()
    if (name && name.length > 1 && !looksLikeUrl(name) && !looksLikeMarkup(name)) {
      results.push({ name, type: 'person', confidence: 'low', source: 'byline' })
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════
// Tag / Keyword Extraction
// ═══════════════════════════════════════════════════════════════════════

function extractTags(html: string): string[] {
  const tags: string[] = []

  // article:tag meta tags
  const tagRe1 = /<meta[^>]+(?:property|name)=["']article:tag["'][^>]+content=["']([^"']+)["']/gi
  const tagRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']article:tag["']/gi
  let m: RegExpExecArray | null
  while ((m = tagRe1.exec(html)) !== null) tags.push(decodeHTMLEntities(m[1]).trim())
  while ((m = tagRe2.exec(html)) !== null) tags.push(decodeHTMLEntities(m[1]).trim())

  // keywords meta tag (comma-separated)
  const kwRe1 = /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i
  const kwRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["']/i
  const kwMatch = html.match(kwRe1) || html.match(kwRe2)
  if (kwMatch) {
    const keywords = kwMatch[1].split(',').map((k) => k.trim()).filter(Boolean)
    tags.push(...keywords)
  }

  return tags.filter((t) => t.length > 0 && t.length < 60)
}

// ═══════════════════════════════════════════════════════════════════════
// oEmbed Extraction
// ═══════════════════════════════════════════════════════════════════════

async function extractFromOEmbed(targetUrl: string, host: string): Promise<EntitySuggestion[]> {
  const oembedEndpoints: Record<string, string> = {
    'youtube.com': `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    'm.youtube.com': `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    'youtu.be': `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    'vimeo.com': `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`,
    'open.spotify.com': `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`,
  }

  const endpoint = oembedEndpoints[host]
  if (!endpoint) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    clearTimeout(timeout)
    if (!res.ok) return []

    const data = (await res.json()) as { author_name?: string; provider_name?: string; author_url?: string }

    const results: EntitySuggestion[] = []
    if (data.author_name) {
      results.push({
        name: data.author_name,
        type: 'person',
        confidence: 'high',
        source: 'oembed',
        meta: { url: data.author_url || undefined },
      })
    }

    return results
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function deduplicateEntities(entities: EntitySuggestion[]): EntitySuggestion[] {
  const seen = new Map<string, EntitySuggestion>()
  const confidenceRank = { high: 3, medium: 2, low: 1 }

  for (const e of entities) {
    const key = `${e.name.toLowerCase()}::${e.type}`
    const existing = seen.get(key)
    if (!existing || confidenceRank[e.confidence] > confidenceRank[existing.confidence]) {
      seen.set(key, e)
    }
  }

  return Array.from(seen.values())
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || /^www\./i.test(s)
}

function looksLikeMarkup(s: string): boolean {
  return /<[a-z]/i.test(s) || /\{[{%]/.test(s)
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

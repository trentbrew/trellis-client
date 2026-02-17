/**
 * URL metadata unfurling endpoint.
 *
 * GET /api/unfurl?url=https://example.com
 *
 * Fetches the target URL and extracts Open Graph / HTML meta tags to
 * return structured metadata (title, description, favicon, thumbnail, siteName).
 * Used by the bookmark create flow to auto-populate fields from a URL.
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const targetUrl = query.url as string | undefined

  if (!targetUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ?url parameter' })
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  // ── oEmbed fast-path for known services ──────────────────────────────
  const host = parsed.hostname.replace(/^www\./, '')
  const oembedResult = await tryOEmbed(targetUrl, host, parsed)
  if (oembedResult) return oembedResult

  // ── Generic HTML scraping ──────────────────────────────────────────
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

    if (!res.ok) {
      return {
        url: targetUrl,
        title: parsed.hostname,
        description: '',
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
        thumbnail: '',
        siteName: parsed.hostname.replace(/^www\./, ''),
      }
    }

    // Read only the first ~100KB to avoid downloading huge pages
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

    // Extract meta tags
    const getMeta = (property: string): string => {
      // Try og: and twitter: variants, plus name= and property= attributes
      for (const attr of ['property', 'name']) {
        for (const prefix of [property, `og:${property}`, `twitter:${property}`]) {
          const re = new RegExp(`<meta[^>]+${attr}=["']${prefix}["'][^>]+content=["']([^"']+)["']`, 'i')
          const match = html.match(re)
          if (match) return match[1]
          // Also check reversed attribute order: content before property
          const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${prefix}["']`, 'i')
          const match2 = html.match(re2)
          if (match2) return match2[1]
        }
      }
      return ''
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const htmlTitle = titleMatch ? titleMatch[1].trim() : ''

    const title = getMeta('title') || htmlTitle || parsed.hostname
    const description = getMeta('description')
    const image = getMeta('image')
    const siteName = getMeta('site_name') || parsed.hostname.replace(/^www\./, '')

    // Resolve relative image URLs
    const resolveUrl = (src: string): string => {
      if (!src) return ''
      try {
        return new URL(src, targetUrl).href
      } catch {
        return ''
      }
    }

    // Favicon: try link[rel~=icon], fall back to Google's favicon service
    const faviconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i)
    const favicon = faviconMatch
      ? resolveUrl(faviconMatch[1])
      : `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`

    return {
      url: targetUrl,
      title: decodeHTMLEntities(title),
      description: decodeHTMLEntities(description),
      favicon,
      thumbnail: resolveUrl(image),
      siteName: decodeHTMLEntities(siteName),
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'URL fetch timed out' })
    }
    // Return basic metadata on fetch failure
    return {
      url: targetUrl,
      title: parsed.hostname,
      description: '',
      favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
      thumbnail: '',
      siteName: parsed.hostname.replace(/^www\./, ''),
    }
  }
})

interface UnfurlResult {
  url: string
  title: string
  description: string
  favicon: string
  thumbnail: string
  siteName: string
}

async function tryOEmbed(targetUrl: string, host: string, parsed: URL): Promise<UnfurlResult | null> {
  // Map hostnames to their oEmbed endpoints
  const oembedEndpoints: Record<string, { endpoint: string; siteName: string; favicon: string }> = {
    'youtube.com': {
      endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
    },
    'm.youtube.com': {
      endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
    },
    'youtu.be': {
      endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
    },
    'vimeo.com': {
      endpoint: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`,
      siteName: 'Vimeo',
      favicon: 'https://vimeo.com/favicon.ico',
    },
    'open.spotify.com': {
      endpoint: `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`,
      siteName: 'Spotify',
      favicon: 'https://open.spotify.com/favicon.ico',
    },
  }

  const config = oembedEndpoints[host]
  if (!config) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(config.endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    clearTimeout(timeout)

    if (!res.ok) return null

    const data = await res.json() as {
      title?: string
      author_name?: string
      thumbnail_url?: string
      description?: string
      provider_name?: string
    }

    return {
      url: targetUrl,
      title: data.title || parsed.hostname,
      description: data.author_name ? `By ${data.author_name}` : '',
      favicon: config.favicon,
      thumbnail: data.thumbnail_url || '',
      siteName: data.provider_name || config.siteName,
    }
  } catch {
    return null
  }
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

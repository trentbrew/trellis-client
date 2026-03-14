import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

// ── Trellis embed directive regexes ─────────────────────────────────

const EMBED_RE = /::embed[({]\s*src="([^"]+)"(?:\s+title="([^"]*)")?\s*[)}]/
const YOUTUBE_RE = /::youtube[({]\s*id="([^"]+)"(?:\s+title="([^"]*)")?\s*[)}]/
const SPOTIFY_RE = /::spotify[({]\s*url="([^"]+)"\s*[)}]/
const IMAGE_RE = /::image[({]\s*src="([^"]+)"(?:\s+alt="([^"]*)")?\s*[)}]/

function toEmbedDiv(src: string, mode: string, height: number, title = '', alt = '') {
  const escapedSrc = src.replace(/"/g, '&quot;')
  const escapedTitle = (title || alt).replace(/"/g, '&quot;')
  return `<div data-type="url-embed" data-src="${escapedSrc}" data-mode="${mode}" data-height="${height}" data-title="${escapedTitle}"></div>`
}

/**
 * Replace ::directive{...} lines in raw markdown text with the TipTap
 * url-embed <div> representation so marked.parse leaves them as raw HTML.
 */
function preprocessMarkdownDirectives(md: string): string {
  return md
    .replace(new RegExp(`^${EMBED_RE.source}$`, 'gm'), (_, src, title) => toEmbedDiv(src, 'embed', 480, title))
    .replace(new RegExp(`^${YOUTUBE_RE.source}$`, 'gm'), (_, id, title) => toEmbedDiv(id, 'youtube', 360, title))
    .replace(new RegExp(`^${SPOTIFY_RE.source}$`, 'gm'), (_, url) => toEmbedDiv(url, 'spotify', 152))
    .replace(new RegExp(`^${IMAGE_RE.source}$`, 'gm'), (_, src, alt) => `<img src="${src.replace(/"/g, '&quot;')}" alt="${(alt || '').replace(/"/g, '&quot;')}" />`)
}

/**
 * Replace ::directive{...} that appear inside <p> tags in already-HTML
 * content (happens when content was saved before the extension existed).
 */
function preprocessHtmlDirectives(html: string): string {
  const p = (re: RegExp) => new RegExp(`<p(?:[^>]*)>${re.source}<[/]p>`, 'g')
  return html
    .replace(p(EMBED_RE), (_, src, title) => toEmbedDiv(src, 'embed', 480, title))
    .replace(p(YOUTUBE_RE), (_, id, title) => toEmbedDiv(id, 'youtube', 360, title))
    .replace(p(SPOTIFY_RE), (_, url) => toEmbedDiv(url, 'spotify', 152))
    .replace(p(IMAGE_RE), (_, src, alt) => `<img src="${src.replace(/"/g, '&quot;')}" alt="${(alt || '').replace(/"/g, '&quot;')}" />`)
}

/**
 * Detect whether a string contains HTML block-level tags,
 * indicating it's already rich HTML content from TipTap.
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false
  return /<(?:p|h[1-6]|ul|ol|li|blockquote|pre|div|table|hr)\b/i.test(content)
}

/**
 * Convert markdown text to HTML using marked.
 * If the content already contains HTML tags, preprocess embed directives
 * then return as-is; otherwise convert markdown (with directive preprocessing).
 */
export function markdownToHtml(content: string): string {
  if (!content) return ''
  if (isHtmlContent(content)) return preprocessHtmlDirectives(content)
  return marked.parse(preprocessMarkdownDirectives(content), { async: false }) as string
}

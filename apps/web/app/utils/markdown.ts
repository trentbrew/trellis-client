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
    .replace(
      new RegExp(`^${IMAGE_RE.source}$`, 'gm'),
      (_, src, alt) => `<img src="${src.replace(/"/g, '&quot;')}" alt="${(alt || '').replace(/"/g, '&quot;')}" />`,
    )
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
    .replace(
      p(IMAGE_RE),
      (_, src, alt) => `<img src="${src.replace(/"/g, '&quot;')}" alt="${(alt || '').replace(/"/g, '&quot;')}" />`,
    )
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
 * Convert marked checkbox list HTML to TipTap TaskList format.
 * marked produces: <ul><li><input type="checkbox"> text</li></ul>
 * TipTap expects: <ul data-type="taskList"><li data-type="taskItem" data-checked="false">text</li></ul>
 *
 * Only converts <ul> lists that contain checkbox inputs. Non-checkbox lists pass through unchanged.
 */
function convertCheckboxesToTaskList(html: string): string {
  // Match list items with checkboxes. Marked produces:
  //   <li><input disabled="" type="checkbox"> text</li>
  //   <li><input checked="" disabled="" type="checkbox"> text</li>
  // Attributes can appear in any order, so match any <input> inside <li>,
  // then inspect its attributes to confirm it's a checkbox and check its state.
  const liInputRe = /<li>(\s*<p>\s*)?<input\b([^>]*)>\s*/gi

  // First pass: convert checkbox list items and track which lists need conversion
  let hasCheckboxList = false
  const processed = html.replace(liInputRe, (match, openP, attrs) => {
    // Only transform inputs that are type="checkbox"
    if (!/type=["']checkbox["']/i.test(attrs)) return match
    hasCheckboxList = true
    const isChecked = /\bchecked(?:=|[\s>])/i.test(attrs)
    const prefix = openP || ''
    return `<li data-type="taskItem" data-checked="${isChecked}">${prefix}`
  })

  if (!hasCheckboxList) return html

  // Second pass: convert <ul> to <ul data-type="taskList"> for lists containing checkboxes
  return processed.replace(/<ul>([\s\S]*?<li data-type="taskItem"[\s\S]*?)<\/ul>/gi, '<ul data-type="taskList">$1</ul>')
}

/**
 * Convert markdown text to HTML using marked.
 * If the content already contains HTML tags, preprocess embed directives
 * then return as-is; otherwise convert markdown (with directive preprocessing).
 */
export function markdownToHtml(content: string): string {
  if (!content) return ''
  if (isHtmlContent(content)) return preprocessHtmlDirectives(content)
  const html = marked.parse(preprocessMarkdownDirectives(content), { async: false }) as string
  return convertCheckboxesToTaskList(html)
}

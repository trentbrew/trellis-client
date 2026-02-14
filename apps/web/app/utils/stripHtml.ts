/**
 * Strip HTML tags from a string, returning plain text.
 * Works in both SSR and client contexts (regex-based, no DOM dependency).
 */
export function stripHtml(input: unknown): string {
  if (input == null) return ''
  const html: string = typeof input === 'string' ? input : Array.isArray(input) ? input.join(' ') : String(input)
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

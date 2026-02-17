import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

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
 * If the content already contains HTML tags, return it as-is.
 */
export function markdownToHtml(content: string): string {
  if (!content) return ''
  if (isHtmlContent(content)) return content
  return marked.parse(content, { async: false }) as string
}

/**
 * Shared helpers for rendering email HTML inside a sandboxed iframe.
 *
 * The iframe approach preserves the email's own styles (tables, inline
 * colours, media queries) while isolating it from the app's CSS.
 *
 * Call sites wire this into an <iframe :srcdoc="...">
 * with sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox".
 */

export interface EmailLike {
  bodyHtml?: string | null
  bodyText?: string | null
  snippet?: string | null
}

// 1x1 transparent gif — used to neutralise unresolvable cid: image references.
const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

/** Remove unsafe + expensive bits. Keep <style>, inline styles, colours, tables, layout. */
export function sanitizeEmailHtml(html: string): string {
  return (
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // External stylesheets: they tend to 404 or serve wrong MIME and block render.
      // Inline <style> blocks remain — those carry the email's own design.
      .replace(/<link\b[^>]*>/gi, '')
      // Nested iframes: security + perf.
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
      .replace(/<iframe\b[^>]*\/?>/gi, '')
      .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, '')
      // Strip all inline event handlers (onclick, onload, onerror, …).
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // Neutralise javascript: hrefs/srcs.
      .replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
      // cid: images never resolve in a browser iframe — swap for a blank pixel
      // so layout height is preserved without the noisy network failure.
      .replace(/(src)\s*=\s*(["'])\s*cid:[^"']*\2/gi, `$1=$2${BLANK_PIXEL}$2`)
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function plaintextToHtml(text: string): string {
  return `<pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,sans-serif;margin:0;">${escapeHtml(text)}</pre>`
}

const BASE_STYLES = `
  html, body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
  body {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #2563eb; }
  pre, code { white-space: pre-wrap; word-break: break-word; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #e5e7eb; color: #555; }
`

export interface BuildSrcdocOptions {
  /** Compact padding + disable pointer events — for thumbnail use. */
  thumbnail?: boolean
}

export function buildEmailSrcdoc(email: EmailLike, opts: BuildSrcdocOptions = {}): string {
  const raw = email.bodyHtml || ''
  const body = raw
    ? sanitizeEmailHtml(raw)
    : email.bodyText
      ? plaintextToHtml(email.bodyText)
      : email.snippet
        ? plaintextToHtml(email.snippet)
        : ''

  const extra = opts.thumbnail
    ? `
      body { padding: 12px; pointer-events: none; user-select: none; }
      a { pointer-events: none; }
    `
    : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base target="_blank">
<style>${BASE_STYLES}${extra}</style>
</head>
<body>${body}</body>
</html>`
}

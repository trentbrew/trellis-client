/**
 * Shared helpers for rendering email HTML inside a sandboxed iframe.
 *
 * The iframe approach preserves the email's own styles (tables, inline
 * colours, media queries) while isolating it from the app's CSS.
 *
 * Call sites wire this into an <iframe :srcdoc="...">
 * with sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox".
 */

import { stripRemoteFonts } from '../utils/stripRemoteFonts'

export interface EmailLike {
  bodyHtml?: string | null
  bodyText?: string | null
  snippet?: string | null
}

// 1x1 transparent gif — used to neutralise unresolvable cid: image references.
const BLANK_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

/** Open/click tracking pixels — often broken TLS or blocked by Tracking Prevention. */
const TRACKING_PIXEL_HOST_PATTERNS = [
  /^links\d*\.airtable\.com$/i,
  /\.list-manage\.com$/i,
  /\.mailtrack\.io$/i,
  /\.sendgrid\.net$/i,
  /^click\./i,
  /^track\./i,
  /^open\./i,
  /^email\./i,
]

export function isEmailTrackingPixelUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed))
    return false
  try {
    const host = new URL(trimmed).hostname
    return TRACKING_PIXEL_HOST_PATTERNS.some((pattern) => pattern.test(host))
  } catch {
    return false
  }
}

function neutralizeRemoteSrc(attr: string, quote: string, url: string): string {
  if (/^cid:/i.test(url) || isEmailTrackingPixelUrl(url))
    return `${attr}=${quote}${BLANK_PIXEL}${quote}`
  return `${attr}=${quote}${url}${quote}`
}

/** Remove unsafe + expensive bits. Keep <style>, inline styles, colours, tables, layout. */
export function sanitizeEmailHtml(html: string): string {
  return stripRemoteFonts(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<script\b[^>]*>/gi, '')
      .replace(/<object\b[\s\S]*?<\/object>/gi, '')
      .replace(/<embed\b[^>]*\/?>/gi, '')
      .replace(/<applet\b[\s\S]*?<\/applet>/gi, '')
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
      // cid: + tracking pixels never resolve cleanly in a sandboxed iframe.
      .replace(/(src)\s*=\s*(["'])([^"']+)\2/gi, (_match, attr, quote, url) =>
        neutralizeRemoteSrc(attr, quote, url))
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
<meta http-equiv="Content-Security-Policy" content="script-src 'none';">
<base target="_blank">
<style>${BASE_STYLES}${extra}</style>
</head>
<body>${body}</body>
</html>`
}

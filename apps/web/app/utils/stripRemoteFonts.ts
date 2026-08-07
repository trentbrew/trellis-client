/**
 * Strip remote (cross-origin) webfont resources from raw HTML so sandboxed
 * embed / email `srcdoc` iframes don't trigger CORS font-fetch errors.
 *
 * Browsers block cross-origin font loads from an `http://localhost` (or `srcdoc`)
 * origin when the CDN sends no `Access-Control-Allow-Origin` header — this is
 * purely cosmetic (system fonts are used as fallback). We drop those remote
 * font sources at the edge instead of letting the browser error.
 *
 * Local and `data:` fonts are preserved. This is applied only to the *rendered*
 * srcdoc payload, never to the stored source.
 */
export function stripRemoteFonts(html: string): string {
  if (!html) return html
  return (
    html
      // Drop @font-face blocks whose src references a remote URL. Local/data:
      // faces are preserved.
      .replace(/@font-face[^{]*\{[\s\S]*?\}/gi, (match) => (/url\(\s*['"]?https?:\/\//i.test(match) ? '' : match))
      // Drop remote webfont <link> stylesheets.
      .replace(/<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '')
      // Neutralise any remaining remote url(...) references (e.g. inline style).
      .replace(/url\(\s*['"]https?:\/\/[^'"()]+['"]?\s*\)/gi, '')
  )
}

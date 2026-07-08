import type { DeckSlideObject, HtmlEmbedConfig, HtmlEmbedSafety } from './types'

export const DEFAULT_HTML_EMBED_SOURCE = `<section style="font-family: ui-sans-serif, system-ui; padding: 24px; color: white; background: #141419;">
  <p style="margin: 0 0 8px; color: #ff8a4c; text-transform: uppercase; letter-spacing: .12em; font-size: 11px;">HTML embed</p>
  <h2 style="margin: 0; font-size: 24px;">Edit this block in the source panel.</h2>
</section>`

export const DEFAULT_HTML_EMBED_SAFETY: HtmlEmbedSafety = {
  allowScripts: false,
  trusted: false,
}

export function createHtmlEmbedConfig(overrides: Partial<HtmlEmbedConfig> = {}): HtmlEmbedConfig {
  const source = overrides.source ?? DEFAULT_HTML_EMBED_SOURCE
  return {
    kind: 'html',
    title: overrides.title ?? 'HTML embed',
    source,
    height: overrides.height ?? 320,
    safety: DEFAULT_HTML_EMBED_SAFETY,
    lastValidSource: overrides.lastValidSource ?? source,
    id: overrides.id,
  }
}

export function htmlSourceContainsScript(source: string): boolean {
  return /<\s*script\b/i.test(source)
}

export function htmlEmbedIframeSandbox(): string {
  return ''
}

export function htmlEmbedIframeTitle(config: Pick<HtmlEmbedConfig, 'title'>): string {
  return config.title?.trim() || 'HTML embed preview'
}

export function isLikelyHtmlEmbedSource(source: string): boolean {
  const trimmed = source.trim()
  return /<iframe\b/i.test(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)
}

type DeckHtmlObjectOverrides = Partial<Omit<DeckSlideObject, 'block'>> & {
  block?: Partial<HtmlEmbedConfig>
}

export function createDeckHtmlObject(overrides: DeckHtmlObjectOverrides = {}): DeckSlideObject {
  const id = overrides.id ?? `html-${Date.now().toString(36)}`
  return {
    id,
    kind: 'html',
    block: {
      ...createHtmlEmbedConfig({ id, title: 'HTML embed' }),
      ...(overrides.block ?? {}),
      kind: 'html',
      safety: DEFAULT_HTML_EMBED_SAFETY,
    },
    frame: overrides.frame ?? {
      x: 12,
      y: 30,
      width: 76,
      height: 38,
      zIndex: 10,
    },
    style: overrides.style ?? {
      fit: 'contain',
      frame: 'card',
    },
    motion: overrides.motion ?? {
      enter: 'none',
      transitionDelayMs: 0,
    },
  }
}

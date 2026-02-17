let initialized = false

export interface MermaidRenderResult {
  svg: string
  error?: never
}

export interface MermaidErrorResult {
  svg?: never
  error: string
}

export type MermaidResult = MermaidRenderResult | MermaidErrorResult

let idCounter = 0

function getThemeVariables(): Record<string, string> {
  if (!import.meta.client) return {}
  const style = getComputedStyle(document.documentElement)
  const get = (v: string) => style.getPropertyValue(v).trim()

  return {
    background: `oklch(${get('--background')})`,
    primaryColor: `oklch(${get('--primary')})`,
    primaryTextColor: `oklch(${get('--primary-foreground')})`,
    primaryBorderColor: `oklch(${get('--border')})`,
    lineColor: `oklch(${get('--muted-foreground')})`,
    secondaryColor: `oklch(${get('--muted')})`,
    tertiaryColor: `oklch(${get('--accent')})`,
    edgeLabelBackground: `oklch(${get('--card')})`,
    nodeBorder: `oklch(${get('--border')})`,
    clusterBkg: `oklch(${get('--muted')})`,
    titleColor: `oklch(${get('--foreground')})`,
    attributeBackgroundColorEven: `oklch(${get('--muted')})`,
    attributeBackgroundColorOdd: `oklch(${get('--card')})`,
    fontFamily: get('--font-sans') || 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '14px',
  }
}

async function ensureInitialized() {
  if (initialized) return
  const mermaid = (await import('mermaid')).default
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: getThemeVariables(),
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  })
  initialized = true
}

export function useMermaid() {
  async function renderDiagram(source: string): Promise<MermaidResult> {
    if (!import.meta.client) return { svg: '' }
    if (!source?.trim()) return { svg: '' }

    try {
      await ensureInitialized()
      const mermaid = (await import('mermaid')).default
      const id = `mermaid-${++idCounter}-${Date.now()}`
      const { svg } = await mermaid.render(id, source)
      return { svg }
    }
    catch (err: any) {
      return { error: err?.message ?? String(err) }
    }
  }

  function resetTheme() {
    initialized = false
  }

  return { renderDiagram, resetTheme }
}

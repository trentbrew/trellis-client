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

function resolveTheme(): 'dark' | 'default' {
  if (!import.meta.client) return 'default'
  const el = document.documentElement
  return el.classList.contains('dark') || el.getAttribute('data-color-mode') === 'dark'
    ? 'dark'
    : 'default'
}

async function ensureInitialized() {
  if (initialized) return
  const mermaid = (await import('mermaid')).default
  mermaid.initialize({
    startOnLoad: false,
    theme: resolveTheme(),
    securityLevel: 'loose',
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

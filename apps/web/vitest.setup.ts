/**
 * Vitest setup — stub @nuxtjs/color-mode client helper.
 *
 * The color-mode plugin expects window.__NUXT_COLOR_MODE__ (injected by a
 * head script in the browser). Under Vitest that script never runs, so
 * preference watches throw `helper.removeColorScheme is not a function`
 * as unhandled rejections and fail the run even when tests pass.
 */
const globalName = '__NUXT_COLOR_MODE__'

function installColorModeHelper() {
  const g = globalThis as typeof globalThis & {
    window?: Window & Record<string, unknown>
    document?: Document
  }
  const win = (g.window ?? (g as unknown as Window)) as Window & Record<string, unknown>
  if (!win || typeof win !== 'object') return

  const existing = win[globalName] as Record<string, unknown> | undefined

  const helper: Record<string, unknown> = {
    preference: 'dark',
    value: 'dark',
    getColorScheme: () => 'dark',
    addColorScheme: (value?: string) => {
      const root = g.document?.documentElement
      if (!root || !value) return
      root.classList.add(value)
    },
    removeColorScheme: (value?: string) => {
      const root = g.document?.documentElement
      if (!root || !value) return
      root.classList.remove(value)
    },
    ...(existing ?? {}),
  }

  if (typeof helper.getColorScheme !== 'function') helper.getColorScheme = () => 'dark'
  if (typeof helper.addColorScheme !== 'function') helper.addColorScheme = () => {}
  if (typeof helper.removeColorScheme !== 'function') helper.removeColorScheme = () => {}

  win[globalName] = helper
}

installColorModeHelper()

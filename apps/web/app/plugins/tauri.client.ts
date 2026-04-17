/**
 * Tauri desktop detection plugin
 * Adds 'tauri' class to html element when running inside Tauri frameless window
 * This enables rounded corners and other desktop-specific styling
 */
export default defineNuxtPlugin(() => {
  // Detect Tauri by checking for the Tauri global object
  const isTauri = typeof window !== 'undefined' && (
    // @ts-expect-error Tauri internals are injected at runtime
    window.__TAURI_INTERNALS__ !== undefined ||
    // @ts-expect-error Tauri global
    window.__TAURI__ !== undefined
  )

  if (isTauri) {
    document.documentElement.classList.add('tauri')
    console.log('[Tauri] Desktop frameless mode detected - rounded corners enabled')
  }

  return {
    provide: {
      isTauri: () => isTauri,
    },
  }
})

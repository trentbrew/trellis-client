let cachedAvailable: boolean | null = null
let probePromise: Promise<boolean> | null = null
let loggedUnavailable = false

/** Reset probe cache — for tests only. */
export function resetSidecarProbeCache(): void {
  cachedAvailable = null
  probePromise = null
  loggedUnavailable = false
}

export function markSidecarUnavailable(): void {
  cachedAvailable = false
}

export async function probeSidecarAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable
  if (!probePromise) {
    probePromise = (async () => {
      try {
        const res = await fetch('/api/trellis/health', { cache: 'no-store' })
        if (!res.ok) {
          cachedAvailable = false
          return false
        }
        const json = (await res.json()) as { available?: boolean }
        cachedAvailable = json.available === true
        return cachedAvailable
      } catch {
        cachedAvailable = false
        return false
      }
    })()
  }
  return probePromise
}

export function logSidecarUnavailableOnce(): void {
  if (loggedUnavailable) return
  loggedUnavailable = true
  console.info(
    '[trellis-sidecar] Sidecar unavailable — page realtime disabled. Run `just sidecar-serve` and restart with TRELLIS_SIDECAR=1.',
  )
}

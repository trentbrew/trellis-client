export function isSidecarConnectionError(error: unknown): boolean {
  if (!(error instanceof TypeError) || error.message !== 'fetch failed') return false
  const code = (error.cause as { code?: string } | undefined)?.code
  return code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND'
}

/** Fetch sidecar; returns null when the room node is unreachable. */
export async function fetchSidecar(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response | null> {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (isSidecarConnectionError(error)) return null
    throw error
  }
}

export const SIDECAR_UNAVAILABLE = {
  message: 'Trellis sidecar unavailable — run `just sidecar-serve` from apps/web',
} as const

export const SIDECAR_DISABLED = {
  message: 'Trellis sidecar disabled — set TRELLIS_SIDECAR=1',
} as const

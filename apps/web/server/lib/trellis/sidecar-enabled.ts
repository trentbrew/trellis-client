/** True when Nuxt should proxy /api/trellis/* to the published trellis sidecar. */
export function isSidecarEnabled(): boolean {
  return process.env.TRELLIS_SIDECAR === '1'
}

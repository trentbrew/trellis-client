/**
 * useActiveVideoPlayer — shares a reference to the currently-mounted video
 * player across sibling components.
 *
 * Why this exists: the AI suggestions sidebar (right panel) needs to seek
 * the video player (center panel) when the user clicks a timestamp badge.
 * The two components are siblings under EntityDialog, so prop drilling
 * would require threading callbacks through 3+ layers. A Nuxt `useState`-
 * backed ref is a clean cross-tree pipe.
 *
 * The YoutubeVideoPanel registers a `seek` function on mount and clears it
 * on unmount. Any consumer can call `seek(seconds)` — it's a no-op when
 * no player is active, so callers never have to check.
 *
 * Keyed by `videoId` so we don't accidentally seek a stale player when
 * switching between bookmarks quickly.
 */

export function useActiveVideoPlayer() {
  const seekFn = useState<((seconds: number) => void) | null>('activeVideoSeek', () => null)
  const videoId = useState<string | null>('activeVideoId', () => null)

  /** Safe seek — does nothing when no player is registered. */
  function seek(seconds: number) {
    seekFn.value?.(seconds)
  }

  function register(id: string, fn: (seconds: number) => void) {
    videoId.value = id
    seekFn.value = fn
  }

  function unregister(id: string) {
    // Only clear if our id is still the active one — avoids races when
    // another panel mounted and took over between our unmount hooks.
    if (videoId.value === id) {
      videoId.value = null
      seekFn.value = null
    }
  }

  return { seek, register, unregister, videoId, seekFn }
}

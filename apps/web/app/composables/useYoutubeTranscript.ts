/**
 * useYoutubeTranscript — fetches + caches + persists YouTube transcripts onto
 * bookmark entities.
 *
 * A bookmark whose `url` points at YouTube ends up with these fields after a
 * successful fetch:
 *   - `videoId`        → canonical 11-char id
 *   - `videoAuthor`    → channel name
 *   - `videoDuration`  → seconds
 *   - `transcript`     → [{ start, duration, text }]
 *   - `chapters`       → [{ start, title }] (may be empty)
 *
 * The fetch is idempotent and skipped when the entity already has cues.
 * Result is also cached in memory keyed by videoId so re-opening the same
 * bookmark in another tab is instant.
 */

export interface TranscriptCue {
  start: number
  duration: number
  text: string
}

export interface VideoChapter {
  start: number
  title: string
}

export interface YoutubeTranscriptResult {
  videoId: string
  title: string
  author: string
  thumbnail: string
  duration: number
  transcript: TranscriptCue[]
  chapters: VideoChapter[]
  language: string
}

/** Extract the 11-char videoId from any common YouTube URL shape. */
export function extractYoutubeId(input: string | undefined | null): string | null {
  if (!input) return null
  const raw = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw

  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      const shorts = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (shorts) return shorts[1]!
      const embed = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embed) return embed[1]!
    }
  } catch {
    /* not a URL */
  }
  const any = raw.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/)
  return any ? any[1]! : null
}

/** Is this string / bookmark entity a YouTube video? */
export function isYoutubeUrl(url: string | undefined | null): boolean {
  return !!extractYoutubeId(url)
}

/**
 * Read transcript cues off an entity regardless of storage format.
 *
 * The TQL EAV store flattens nested object-arrays into dot-paths —
 * e.g. `transcript: [{start, text}]` becomes `transcript.start: [...]` +
 * `transcript.text: [...]`. We also store a canonical `transcriptJson`
 * string as a belt-and-braces fallback for round-trip fidelity.
 *
 * Returns an empty array when no transcript is available.
 */
export function parseTranscript(entity: any): TranscriptCue[] {
  if (!entity) return []

  // 1) Already parsed array of objects (in-memory, after fetch)
  const inline = entity.transcript
  if (Array.isArray(inline) && inline.length > 0 && typeof inline[0] === 'object') {
    return inline as TranscriptCue[]
  }

  // 2) Canonical JSON string
  if (typeof entity.transcriptJson === 'string' && entity.transcriptJson) {
    try {
      const parsed = JSON.parse(entity.transcriptJson)
      if (Array.isArray(parsed)) return parsed as TranscriptCue[]
    } catch {
      /* fall through */
    }
  }

  // 3) Flattened dot-path columns (TQL EAV roundtrip)
  const starts = entity['transcript.start']
  const durations = entity['transcript.duration']
  const texts = entity['transcript.text']
  if (Array.isArray(starts) && Array.isArray(texts) && starts.length === texts.length) {
    return starts.map((start: number, i: number) => ({
      start: Number(start) || 0,
      duration: Number(durations?.[i]) || 0,
      text: String(texts[i] ?? ''),
    }))
  }

  return []
}

/** Read chapter markers off an entity regardless of storage format. */
export function parseChapters(entity: any): VideoChapter[] {
  if (!entity) return []

  const inline = entity.chapters
  if (Array.isArray(inline) && inline.length > 0 && typeof inline[0] === 'object') {
    return inline as VideoChapter[]
  }

  if (typeof entity.chaptersJson === 'string' && entity.chaptersJson) {
    try {
      const parsed = JSON.parse(entity.chaptersJson)
      if (Array.isArray(parsed)) return parsed as VideoChapter[]
    } catch {
      /* fall through */
    }
  }

  const starts = entity['chapters.start']
  const titles = entity['chapters.title']
  if (Array.isArray(starts) && Array.isArray(titles) && starts.length === titles.length) {
    return starts.map((start: number, i: number) => ({
      start: Number(start) || 0,
      title: String(titles[i] ?? ''),
    }))
  }

  return []
}

const memoryCache = new Map<string, YoutubeTranscriptResult>()

export function useYoutubeTranscript() {
  const { update: updateEntity } = useEntities()

  const fetching = ref<Set<string>>(new Set())
  const errors = ref<Map<string, string>>(new Map())

  function isFetching(videoId: string): boolean {
    return fetching.value.has(videoId)
  }

  function getCached(videoId: string): YoutubeTranscriptResult | undefined {
    return memoryCache.get(videoId)
  }

  /** Raw fetch — returns transcript + metadata. Throws on failure. */
  async function fetchTranscript(urlOrId: string, lang = 'en'): Promise<YoutubeTranscriptResult> {
    const videoId = extractYoutubeId(urlOrId)
    if (!videoId) throw new Error('Not a valid YouTube URL or videoId')

    const cached = memoryCache.get(videoId)
    if (cached) return cached

    fetching.value = new Set([...fetching.value, videoId])
    errors.value.delete(videoId)

    try {
      const data = await $fetch<YoutubeTranscriptResult>('/api/youtube/transcript', {
        method: 'POST',
        body: { videoId, lang },
      })
      memoryCache.set(videoId, data)
      return data
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to fetch transcript'
      errors.value.set(videoId, msg)
      throw new Error(msg)
    } finally {
      const next = new Set(fetching.value)
      next.delete(videoId)
      fetching.value = next
    }
  }

  /**
   * Ensure a bookmark entity has its transcript fields populated. Safe to
   * call repeatedly — skips when already present, caches results, and never
   * overwrites a transcript that's already on the entity.
   *
   * Returns the transcript (from cache, entity, or fresh fetch) or null if
   * the URL isn't a YouTube video / no transcript is available.
   */
  async function ensureTranscriptOnEntity(entity: any): Promise<YoutubeTranscriptResult | null> {
    if (!entity?.url) return null
    const videoId = extractYoutubeId(entity.url)
    if (!videoId) return null

    // Already on the entity? Reconstruct a result object from stored fields.
    const existingCues = parseTranscript(entity)
    if (existingCues.length > 0) {
      const result: YoutubeTranscriptResult = {
        videoId,
        title: entity.title || '',
        author: entity.videoAuthor || '',
        thumbnail: entity.thumbnail || '',
        duration: Number(entity.videoDuration) || 0,
        transcript: existingCues,
        chapters: parseChapters(entity),
        language: entity.videoLanguage || 'auto',
      }
      memoryCache.set(videoId, result)
      return result
    }

    // Otherwise: fetch + persist.
    try {
      const result = await fetchTranscript(videoId)

      // Store as both inline arrays AND JSON strings. TQL's EAV store
      // flattens the array-of-object shape into dot-paths on round-trip,
      // so the JSON string is our canonical survivable form.
      const patch: Record<string, any> = {
        videoId: result.videoId,
        videoAuthor: result.author,
        videoDuration: result.duration,
        videoLanguage: result.language,
        transcript: result.transcript,
        chapters: result.chapters,
        transcriptJson: JSON.stringify(result.transcript),
        chaptersJson: JSON.stringify(result.chapters),
      }

      // Only fill title/thumbnail if the bookmark doesn't already have them
      // (user-entered values win).
      if (!entity.title && result.title) patch.title = result.title
      if (!entity.thumbnail && result.thumbnail) patch.thumbnail = result.thumbnail

      await updateEntity({ ...entity, ...patch } as any)
      return result
    } catch {
      return null
    }
  }

  return {
    fetching,
    errors,
    isFetching,
    getCached,
    fetchTranscript,
    ensureTranscriptOnEntity,
  }
}

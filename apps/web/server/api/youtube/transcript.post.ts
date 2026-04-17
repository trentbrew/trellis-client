/**
 * YouTube transcript + metadata endpoint.
 *
 * Given a YouTube URL or videoId, returns:
 *  - videoId
 *  - title, author, thumbnail (via oEmbed)
 *  - transcript cues: [{ start, duration, text }] in seconds
 *  - chapters: [{ start, title }] when extractable from the watch page
 *  - duration (inferred from last cue)
 *
 * Uses the `youtube-transcript` npm package for cue extraction (it handles
 * both manually-uploaded and auto-generated captions). Metadata comes from
 * YouTube's public oEmbed endpoint (no auth required). Chapters are best-
 * effort scraped from the watch page HTML's `ytInitialData` blob.
 *
 * POST /api/youtube/transcript
 * Body: { url?: string, videoId?: string, lang?: string }
 * Response: YoutubeTranscriptResult
 */

// The package declares `type: module` but ships its main as CJS, which
// breaks named ESM imports under Nitro. Import the ESM bundle directly.
// @ts-expect-error — package lacks type declarations for this sub-path.
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js'

export interface TranscriptCue {
  start: number // seconds
  duration: number // seconds
  text: string
}

export interface VideoChapter {
  start: number // seconds
  title: string
}

export interface YoutubeTranscriptResult {
  videoId: string
  title: string
  author: string
  thumbnail: string
  duration: number // seconds, 0 if unknown
  transcript: TranscriptCue[]
  chapters: VideoChapter[]
  language: string
}

/**
 * Extract the canonical 11-char YouTube videoId from any URL shape.
 * Handles youtube.com/watch?v=, youtu.be/, youtube.com/shorts/,
 * youtube.com/embed/, and bare ids.
 */
export function extractYoutubeId(input: string): string | null {
  if (!input) return null
  const raw = input.trim()

  // Bare id (11 chars, word-safe)
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
    /* not a URL, fall through */
  }

  // Last-ditch regex scan for 11-char ids after v= or /
  const anyMatch = raw.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/)
  return anyMatch ? anyMatch[1]! : null
}

/** Fetch oEmbed metadata (title, author, thumbnail). Never throws. */
async function fetchOEmbed(videoId: string): Promise<{
  title: string
  author: string
  thumbnail: string
}> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { 'User-Agent': 'Mozilla/5.0 TrellisBot/1.0' } },
    )
    if (!res.ok) return { title: '', author: '', thumbnail: '' }
    const data = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    return {
      title: data.title || '',
      author: data.author_name || '',
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  } catch {
    return {
      title: '',
      author: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  }
}

/**
 * Best-effort chapter extraction from the watch page HTML. YouTube embeds
 * chapters inside a `ytInitialData` JSON blob under a `macroMarkersListRenderer`.
 * Returns [] on any failure — chapters are a nice-to-have, not critical.
 */
async function fetchChapters(videoId: string): Promise<VideoChapter[]> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return []

    const html = await res.text()

    // Locate the initial data blob.
    const match = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
    if (!match) return []

    let data: any
    try {
      data = JSON.parse(match[1]!)
    } catch {
      return []
    }

    // Walk engagementPanels for the chapter list renderer.
    const panels = data?.engagementPanels
    if (!Array.isArray(panels)) return []

    for (const panel of panels) {
      const contents = panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents
      if (!Array.isArray(contents)) continue

      const chapters: VideoChapter[] = []
      for (const entry of contents) {
        const r = entry?.macroMarkersListItemRenderer
        if (!r) continue
        const title = r?.title?.simpleText || r?.title?.runs?.[0]?.text || ''
        const ms = Number(r?.onTap?.watchEndpoint?.startTimeMs ?? r?.timeDescription?.simpleText)
        const startSec = Number.isFinite(ms) ? ms / 1000 : parseTimeString(r?.timeDescription?.simpleText)
        if (title && Number.isFinite(startSec)) {
          chapters.push({ start: startSec, title })
        }
      }

      if (chapters.length) return chapters
    }
  } catch {
    /* ignore */
  }
  return []
}

/** Parse "h:mm:ss" or "mm:ss" into seconds. Returns NaN on failure. */
function parseTimeString(s?: string): number {
  if (!s) return Number.NaN
  const parts = s.split(':').map((p) => parseInt(p, 10))
  if (parts.some((n) => Number.isNaN(n))) return Number.NaN
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  return Number.NaN
}

/**
 * Fetch transcript cues. `youtube-transcript` returns durations/offsets in
 * milliseconds in newer versions and seconds in older ones — we normalise
 * both to seconds.
 */
async function fetchTranscript(videoId: string, lang: string): Promise<{ cues: TranscriptCue[]; language: string }> {
  // The library throws on videos without captions. We let it bubble; the
  // handler wraps it into a 422 so the client can distinguish.
  const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang })

  return { cues: normaliseCues(raw), language: lang }
}

/**
 * `youtube-transcript` returns offsets/durations in different units depending
 * on which internal parser path it took:
 *   • New `<p t="ms" d="ms">` format → integer milliseconds
 *   • Legacy `<text start="s.s" dur="s.s">` format → fractional seconds
 *
 * Heuristic: no subtitle cue is longer than 100 seconds, so any `duration`
 * over 100 must be milliseconds. Falls back to offset comparison for the
 * rare case where every cue has 0 duration.
 */
function normaliseCues(raw: any[]): TranscriptCue[] {
  if (!raw.length) return []

  const anyBigDuration = raw.some((r: any) => Number(r.duration) > 100)
  const anyBigOffset = raw.some((r: any) => Number(r.offset) > 7200) // > 2h in seconds
  const unitMs = anyBigDuration || anyBigOffset

  const divisor = unitMs ? 1000 : 1

  return raw.map((r: any) => ({
    start: (Number(r.offset) || 0) / divisor,
    duration: (Number(r.duration) || 0) / divisor,
    text: decodeHtmlEntities(
      String(r.text || '')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  }))
}

/** Minimal HTML entity decoder — transcripts often contain `&amp;`, `&#39;` etc. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    url?: string
    videoId?: string
    lang?: string
  }

  const input = body?.videoId || body?.url
  if (!input) {
    throw createError({ statusCode: 400, message: '"url" or "videoId" is required' })
  }

  const videoId = extractYoutubeId(input)
  if (!videoId) {
    throw createError({ statusCode: 400, message: 'Could not extract a YouTube video id' })
  }

  const lang = (body.lang || 'en').toLowerCase()

  let transcript: TranscriptCue[] = []
  let language = lang

  try {
    const result = await fetchTranscript(videoId, lang)
    transcript = result.cues
    language = result.language
  } catch (err: any) {
    // If the requested language is missing, fall back to whatever track
    // `youtube-transcript` returns by default (undefined lang).
    try {
      const fallback = await YoutubeTranscript.fetchTranscript(videoId)
      transcript = normaliseCues(fallback)
      language = 'auto'
    } catch (fallbackErr: any) {
      throw createError({
        statusCode: 422,
        message: `No transcript available: ${err?.message || fallbackErr?.message || 'unknown error'}`,
      })
    }
  }

  // Fetch metadata + chapters in parallel. Neither blocks on the other and
  // both are best-effort (return empty data on failure).
  const [oembed, chapters] = await Promise.all([fetchOEmbed(videoId), fetchChapters(videoId)])

  const lastCue = transcript[transcript.length - 1]
  const duration = lastCue ? Math.round(lastCue.start + lastCue.duration) : 0

  const result: YoutubeTranscriptResult = {
    videoId,
    title: oembed.title,
    author: oembed.author,
    thumbnail: oembed.thumbnail,
    duration,
    transcript,
    chapters,
    language,
  }

  return result
})

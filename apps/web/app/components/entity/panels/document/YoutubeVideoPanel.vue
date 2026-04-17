<script lang="ts" setup>
  /**
   * YoutubeVideoPanel — player + synchronised transcript/chapter sidebar.
   *
   * Layout (when transcript is available):
   *   ┌──────────────┬────────────────────────┐
   *   │ Transcript   │ YouTube iframe player  │
   *   │ + chapters   │ (flex-1)               │
   *   │ (w-80)       │                        │
   *   └──────────────┴────────────────────────┘
   *
   * The iframe is controlled via the official YouTube IFrame Player API so
   * we can read `currentTime` on every frame and seek from transcript clicks.
   * Active cue + active chapter are highlighted in realtime.
   *
   * Props:
   *   - entity: bookmark entity containing { videoId, transcript, chapters }
   *
   * Exposes (defineExpose):
   *   - seek(seconds)
   */

  import type { TranscriptCue, VideoChapter } from '~/composables/useYoutubeTranscript'
  import { parseChapters, parseTranscript } from '~/composables/useYoutubeTranscript'
  import { useActiveVideoPlayer } from '~/composables/useActiveVideoPlayer'

  const props = defineProps<{
    entity: any
  }>()

  const { register, unregister } = useActiveVideoPlayer()

  const videoId = computed<string>(() => props.entity?.videoId || '')
  const transcript = computed<TranscriptCue[]>(() => parseTranscript(props.entity))
  const chapters = computed<VideoChapter[]>(() => parseChapters(props.entity))
  const hasTranscript = computed(() => transcript.value.length > 0)
  const hasChapters = computed(() => chapters.value.length > 0)

  // ── Player state ──────────────────────────────────────────────────────
  const playerContainer = ref<HTMLDivElement | null>(null)
  const cueListRef = ref<HTMLDivElement | null>(null)
  let player: any = null
  const currentTime = ref(0)
  const isReady = ref(false)
  let rafId: number | null = null

  /**
   * Load the YouTube IFrame Player API (once per page). Returns a promise
   * that resolves as soon as `window.YT.Player` is available.
   */
  function loadYoutubeApi(): Promise<any> {
    if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
    const w = window as any
    if (w.YT && w.YT.Player) return Promise.resolve(w.YT)
    if (w.__ytApiPromise) return w.__ytApiPromise

    w.__ytApiPromise = new Promise((resolve) => {
      const prev = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        resolve(w.YT)
      }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        s.async = true
        document.head.appendChild(s)
      }
    })
    return w.__ytApiPromise
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  /**
   * Active cue index based on current playback time. A cue is "active" from
   * its `start` until `start + duration`. If no cue matches exactly, falls
   * back to the last cue whose start is in the past.
   */
  const activeCueIndex = computed(() => {
    const t = currentTime.value
    const cues = transcript.value
    if (!cues.length) return -1

    // Binary-search for the last cue with start <= t
    let lo = 0
    let hi = cues.length - 1
    let idx = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if ((cues[mid]?.start ?? 0) <= t) {
        idx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return idx
  })

  const activeChapterIndex = computed(() => {
    const t = currentTime.value
    const chs = chapters.value
    if (!chs.length) return -1
    let idx = -1
    for (let i = 0; i < chs.length; i++) {
      if ((chs[i]?.start ?? 0) <= t) idx = i
      else break
    }
    return idx
  })

  // ── Autoscroll active cue into view ──────────────────────────────────
  let lastScrolledIndex = -1
  let userScrolledAt = 0

  function onUserScroll() {
    userScrolledAt = Date.now()
  }

  watch(activeCueIndex, (idx) => {
    if (idx < 0 || idx === lastScrolledIndex) return
    // If the user scrolled manually in the last 3s, don't fight them.
    if (Date.now() - userScrolledAt < 3000) return
    const list = cueListRef.value
    if (!list) return
    const el = list.querySelector<HTMLElement>(`[data-cue-index="${idx}"]`)
    if (!el) return
    // Center the active cue within the scrollable list.
    const listRect = list.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - listRect.top - listRect.height / 2 + elRect.height / 2
    list.scrollBy({ top: offset, behavior: 'smooth' })
    lastScrolledIndex = idx
  })

  // ── Player lifecycle ──────────────────────────────────────────────────
  async function initPlayer() {
    if (!videoId.value || !playerContainer.value) return

    try {
      const YT = await loadYoutubeApi()
      // The API replaces the passed element with an <iframe>.
      player = new YT.Player(playerContainer.value, {
        videoId: videoId.value,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            isReady.value = true
            startTimeLoop()
            // Publish our seek so sibling components (e.g. the AI
            // suggestions panel) can jump the player on timestamp click.
            register(videoId.value, seek)
          },
        },
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[YoutubeVideoPanel] Failed to init YT player:', err)
    }
  }

  function startTimeLoop() {
    function tick() {
      if (player && typeof player.getCurrentTime === 'function') {
        const t = player.getCurrentTime()
        if (Number.isFinite(t)) currentTime.value = t
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function stopTimeLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function seek(seconds: number) {
    if (!player) return
    try {
      player.seekTo(seconds, true)
      // Ensure playback continues after a seek.
      if (typeof player.playVideo === 'function') player.playVideo()
      currentTime.value = seconds
    } catch {
      /* ignore */
    }
  }

  function handleCueClick(cue: TranscriptCue) {
    seek(cue.start)
  }

  function handleChapterClick(chapter: VideoChapter) {
    seek(chapter.start)
  }

  onMounted(() => {
    if (videoId.value) initPlayer()
  })

  // If the underlying video changes (different bookmark loaded into the
  // same component instance), swap the video in-place.
  watch(videoId, (id, prev) => {
    if (!id || id === prev) return
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById(id)
      currentTime.value = 0
      lastScrolledIndex = -1
    } else if (!player) {
      initPlayer()
    }
  })

  onBeforeUnmount(() => {
    stopTimeLoop()
    unregister(videoId.value)
    if (player && typeof player.destroy === 'function') {
      try {
        player.destroy()
      } catch {
        /* ignore */
      }
    }
    player = null
  })

  defineExpose({ seek })
</script>

<template>
  <div class="flex-1 flex min-h-0 bg-background">
    <!-- Transcript + chapters sidebar -->
    <aside v-if="hasTranscript" class="w-80 shrink-0 border-r border-border flex flex-col min-h-0">
      <!-- Chapters -->
      <div v-if="hasChapters" class="shrink-0 border-b border-border/70 bg-muted/10 max-h-48 overflow-y-auto">
        <p class="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Chapters</p>
        <ul class="pb-1">
          <li
            v-for="(chapter, i) in chapters"
            :key="`${chapter.start}-${i}`"
            :class="[
              'px-3 py-1 flex items-center gap-2 cursor-pointer text-xs transition-colors',
              activeChapterIndex === i
                ? 'bg-primary/10 text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            ]"
            @click="handleChapterClick(chapter)">
            <span class="font-mono shrink-0 text-[10px] text-muted-foreground w-10">
              {{ formatTime(chapter.start) }}
            </span>
            <span class="truncate">{{ chapter.title }}</span>
          </li>
        </ul>
      </div>

      <!-- Transcript cues -->
      <div class="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/70">
        <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Transcript</p>
        <span class="text-[10px] text-muted-foreground">{{ transcript.length }} cues</span>
      </div>
      <div ref="cueListRef" class="flex-1 overflow-y-auto" @wheel="onUserScroll" @touchmove="onUserScroll">
        <ul class="py-1">
          <li
            v-for="(cue, i) in transcript"
            :key="i"
            :data-cue-index="i"
            :class="[
              'px-3 py-1 flex gap-2 cursor-pointer text-xs leading-snug transition-colors',
              activeCueIndex === i
                ? 'bg-primary/15 text-foreground border-l-2 border-primary'
                : 'text-muted-foreground border-l-2 border-transparent hover:bg-muted/40 hover:text-foreground',
            ]"
            @click="handleCueClick(cue)">
            <span class="font-mono shrink-0 text-[10px] text-muted-foreground/70 pt-0.5 w-10">
              {{ formatTime(cue.start) }}
            </span>
            <span>{{ cue.text }}</span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Player — the <div> gets replaced by an <iframe> via YT.Player API -->
    <div class="flex-1 relative min-h-0 bg-black">
      <div v-if="!isReady" class="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
        <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin" />
      </div>
      <!-- YT.Player replaces this div with an <iframe> on init -->
      <div ref="playerContainer" class="absolute inset-0 w-full h-full" />
    </div>
  </div>
</template>

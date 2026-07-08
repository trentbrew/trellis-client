/** Format milliseconds as M:SS for recording timer display. */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const MAX_DURATION_MS = 10 * 60 * 1000
const WARN_DURATION_MS = 5 * 60 * 1000

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t))
}

export interface VoiceRecordingResult {
  blob: Blob
  durationSeconds: number
  mimeType: string
}

export function useVoiceRecorder() {
  const isRecording = ref(false)
  const durationMs = ref(0)
  const error = ref<string | null>(null)
  const isNearLimit = computed(() => durationMs.value >= WARN_DURATION_MS)

  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let autoStopPromise: Promise<VoiceRecordingResult | null> | null = null

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function revokeStream() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
    }
  }

  async function startRecording(): Promise<void> {
    error.value = null

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      error.value = 'Recording is not supported in this browser.'
      return
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      chunks = []
      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      mediaRecorder.start(250)
      isRecording.value = true
      startedAt = Date.now()
      durationMs.value = 0

      clearTimer()
      timer = setInterval(() => {
        durationMs.value = Date.now() - startedAt
        if (durationMs.value >= MAX_DURATION_MS && !autoStopPromise) {
          autoStopPromise = stopRecording().finally(() => {
            autoStopPromise = null
          })
        }
      }, 200)
    } catch (err: unknown) {
      const name = (err as DOMException)?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        error.value = 'Microphone access denied. Enable it in your browser settings.'
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        error.value = 'No microphone found.'
      } else {
        error.value = (err as Error)?.message || 'Could not start recording.'
      }
      revokeStream()
      mediaRecorder = null
    }
  }

  function stopRecording(): Promise<VoiceRecordingResult | null> {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        clearTimer()
        isRecording.value = false
        resolve(null)
        return
      }

      const finalDurationMs = Date.now() - startedAt

      mediaRecorder.onstop = () => {
        clearTimer()
        isRecording.value = false
        const mimeType = mediaRecorder?.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type: mimeType })
        revokeStream()
        mediaRecorder = null
        chunks = []
        resolve({
          blob,
          durationSeconds: Math.max(1, Math.round(finalDurationMs / 1000)),
          mimeType,
        })
      }

      try {
        mediaRecorder.stop()
      } catch {
        clearTimer()
        isRecording.value = false
        revokeStream()
        mediaRecorder = null
        resolve(null)
      }
    })
  }

  onUnmounted(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
      } catch {
        /* noop */
      }
    }
    clearTimer()
    revokeStream()
  })

  return {
    isRecording,
    durationMs,
    isNearLimit,
    error,
    formatDuration: computed(() => formatDurationMs(durationMs.value)),
    startRecording,
    stopRecording,
    revokeStream,
  }
}

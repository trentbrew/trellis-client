<script lang="ts" setup>
  import { createDefaultFile, createDefaultNote, type EntityReference } from '~/types/entity'

  type VoicePhase = 'idle' | 'recording' | 'processing' | 'review'

  const emit = defineEmits<{
    saved: [noteId: string, title: string]
  }>()

  const VOICE_DRAFT_KEY = 'trellis:quicknote:voice-draft'

  const phase = ref<VoicePhase>('idle')
  const transcript = ref('')
  const transcriptionError = ref('')
  const audioPreviewUrl = ref<string | null>(null)
  const recordingBlob = ref<Blob | null>(null)
  const recordingMimeType = ref('audio/webm')
  const recordingDurationSeconds = ref(0)
  const isSaving = ref(false)
  const savedFlash = ref(false)

  const { isRecording, durationMs, isNearLimit, error: recorderError, formatDuration, startRecording, stopRecording, revokeStream } =
    useVoiceRecorder()
  const { uploadFile } = useFileUpload('voice-memo')
  const { create } = useTrellisEntities()
  const { wp } = useWorkspacePath()
  const nuxtApp = useNuxtApp()
  const router = useRouter()

  const isBusy = computed(() => isRecording.value || phase.value === 'processing' || isSaving.value)

  function loadVoiceDraft() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(VOICE_DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { transcript?: string; durationSeconds?: number }
      if (parsed.transcript) {
        transcript.value = parsed.transcript
        recordingDurationSeconds.value = parsed.durationSeconds || 0
        phase.value = 'review'
      }
    } catch {
      /* noop */
    }
  }

  function persistVoiceDraft() {
    if (typeof window === 'undefined') return
    try {
      if (phase.value === 'review' && transcript.value.trim()) {
        window.localStorage.setItem(
          VOICE_DRAFT_KEY,
          JSON.stringify({
            transcript: transcript.value,
            durationSeconds: recordingDurationSeconds.value,
          }),
        )
      } else {
        window.localStorage.removeItem(VOICE_DRAFT_KEY)
      }
    } catch {
      /* noop */
    }
  }

  function clearVoiceDraft() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(VOICE_DRAFT_KEY)
    } catch {
      /* noop */
    }
  }

  watch(transcript, () => {
    if (phase.value === 'review') persistVoiceDraft()
  })

  function revokePreviewUrl() {
    if (audioPreviewUrl.value) {
      URL.revokeObjectURL(audioPreviewUrl.value)
      audioPreviewUrl.value = null
    }
  }

  function resetAll() {
    revokePreviewUrl()
    recordingBlob.value = null
    transcript.value = ''
    transcriptionError.value = ''
    recordingDurationSeconds.value = 0
    phase.value = 'idle'
    clearVoiceDraft()
    revokeStream()
  }

  async function handleStartRecording() {
    transcriptionError.value = ''
    await startRecording()
    if (!recorderError.value) {
      phase.value = 'recording'
    }
  }

  async function handleStopRecording() {
    const result = await stopRecording()
    if (!result || result.blob.size === 0) {
      phase.value = 'idle'
      return
    }

    recordingBlob.value = result.blob
    recordingMimeType.value = result.mimeType
    recordingDurationSeconds.value = result.durationSeconds
    revokePreviewUrl()
    audioPreviewUrl.value = URL.createObjectURL(result.blob)
    phase.value = 'processing'

    const formData = new FormData()
    const ext = result.mimeType.includes('mp4') ? 'm4a' : 'webm'
    formData.append('file', result.blob, `voice-memo.${ext}`)
    formData.append('durationSeconds', String(result.durationSeconds))

    try {
      const data = await $fetch<{ transcript: string }>('/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      })
      transcript.value = data.transcript
      transcriptionError.value = ''
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message
        || (err as Error)?.message
        || 'Transcription failed'
      transcriptionError.value =
        status === 503
          ? 'Transcription unavailable — add a transcript manually or save audio only.'
          : message
      transcript.value = ''
    }

    phase.value = 'review'
    persistVoiceDraft()
  }

  function generateTitle(): string {
    const now = new Date()
    return `Voice Memo — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  async function handleSave() {
    if (isSaving.value || !recordingBlob.value) return

    isSaving.value = true
    const noteTitle = generateTitle()

    try {
      const ext = recordingMimeType.value.includes('mp4') ? 'm4a' : 'webm'
      const uploadName = `voice-memo-${Date.now()}.${ext}`
      const uploadFileObj = new File([recordingBlob.value], uploadName, { type: recordingMimeType.value })
      const uploaded = await uploadFile(uploadFileObj)

      const fileEntityId = await create({
        ...createDefaultFile(),
        title: noteTitle,
        mimeType: uploaded.contentType || recordingMimeType.value,
        sizeBytes: uploaded.size,
        url: uploaded.url,
        fileCategory: 'audio',
        fileExtension: ext,
        audioDuration: recordingDurationSeconds.value,
        tags: ['voicememo'],
      } as any)

      const refId = `voice-audio-${Date.now()}`
      const references: EntityReference[] = [
        {
          kind: 'entity',
          id: refId,
          entityId: fileEntityId as string,
          entityType: 'file',
          title: 'Voice recording',
          direction: 'outgoing',
        },
      ]

      const noteId = await create({
        ...createDefaultNote(),
        title: noteTitle,
        content: transcript.value.trim(),
        tags: ['quicknote', 'voicememo'],
        references,
      } as any)

      savedFlash.value = true
      emit('saved', noteId as string, noteTitle)
      ;(nuxtApp as any).$toast?.success('Voice memo saved', {
        description: noteTitle,
        action: {
          label: 'Open note',
          onClick: () => router.push({ path: wp('/workspace/notes'), query: { id: noteId } }),
        },
      })

      setTimeout(() => {
        savedFlash.value = false
        resetAll()
      }, 400)
    } catch (err) {
      console.error('[VoiceCapture] Failed to save:', err)
      ;(nuxtApp as any).$toast?.error('Failed to save voice memo')
    } finally {
      isSaving.value = false
    }
  }

  function handleReRecord() {
    if (isRecording.value) return
    resetAll()
  }

  function handleDiscard() {
    if (isRecording.value) {
      if (!confirm('Stop recording and discard?')) return
      void stopRecording().then(() => {
        resetAll()
      })
      return
    }
    if (phase.value === 'review' && (transcript.value.trim() || recordingBlob.value)) {
      if (!confirm('Discard this voice memo?')) return
    }
    resetAll()
  }

  /** Called by parent before closing panel or switching to text mode. */
  async function requestClose(): Promise<boolean> {
    if (isRecording.value) {
      if (!confirm('Stop recording and discard?')) return false
      await stopRecording()
      resetAll()
      return true
    }
    if (phase.value === 'review' && (transcript.value.trim() || recordingBlob.value)) {
      if (!confirm('Discard this voice memo?')) return false
      resetAll()
    }
    return true
  }

  function onKeydown(event: KeyboardEvent) {
    if (phase.value === 'recording' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      void handleStopRecording()
    }
    if (phase.value === 'review' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSave()
    }
  }

  onMounted(() => loadVoiceDraft())
  onUnmounted(() => {
    revokePreviewUrl()
    revokeStream()
  })

  defineExpose({
    isRecording,
    isBusy,
    phase,
    requestClose,
  })
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0" tabindex="0" @keydown="onKeydown">
    <!-- Idle -->
    <div v-if="phase === 'idle'" class="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-8">
      <button
        type="button"
        class="h-20 w-20 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center"
        aria-label="Start recording"
        @click="handleStartRecording">
        <Icon name="lucide:mic" class="h-8 w-8" />
      </button>
      <p class="text-sm text-muted-foreground text-center">Tap to record a voice memo</p>
      <p v-if="recorderError" class="text-xs text-destructive text-center max-w-xs">{{ recorderError }}</p>
    </div>

    <!-- Recording -->
    <div v-else-if="phase === 'recording'" class="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-8">
      <div class="relative">
        <span class="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
        <button
          type="button"
          class="relative h-20 w-20 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors flex items-center justify-center"
          aria-label="Stop recording"
          @click="handleStopRecording">
          <Icon name="lucide:square" class="h-7 w-7 fill-current" />
        </button>
      </div>
      <p class="text-2xl font-mono tabular-nums text-foreground">{{ formatDuration }}</p>
      <p v-if="isNearLimit" class="text-xs text-amber-600 dark:text-amber-400 text-center">
        Long recording — max 10 minutes
      </p>
      <p class="text-xs text-muted-foreground">Press Enter or Space to stop</p>
    </div>

    <!-- Processing -->
    <div v-else-if="phase === 'processing'" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8">
      <Icon name="svg-spinners:ring-resize" class="h-8 w-8 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">Transcribing…</p>
    </div>

    <!-- Review -->
    <div v-else class="flex-1 flex flex-col min-h-0 px-4 py-4 gap-3">
      <audio v-if="audioPreviewUrl" :src="audioPreviewUrl" controls class="w-full h-9 shrink-0" />

      <p v-if="transcriptionError" class="text-xs text-amber-600 dark:text-amber-400 shrink-0">
        {{ transcriptionError }}
      </p>

      <textarea
        v-model="transcript"
        placeholder="Transcript will appear here — edit before saving"
        class="flex-1 min-h-[200px] w-full resize-none rounded-lg border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />

      <div class="flex items-center justify-between shrink-0 pt-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-muted-foreground/50 font-medium">voicememo</span>
          <span v-if="recordingDurationSeconds" class="text-[10px] text-muted-foreground/40 font-mono">
            {{ recordingDurationSeconds }}s
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            :disabled="isSaving"
            @click="handleReRecord">
            Re-record
          </button>
          <button
            type="button"
            class="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            :disabled="isSaving"
            @click="handleDiscard">
            Discard
          </button>
          <UiButton
            size="sm"
            class="h-6 px-2.5 text-xs gap-1"
            :disabled="!recordingBlob || isSaving"
            @click="handleSave">
            <Icon v-if="isSaving" name="svg-spinners:ring-resize" class="h-3 w-3" />
            <Icon v-else-if="savedFlash" name="lucide:check" class="h-3 w-3" />
            <span>{{ isSaving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save' }}</span>
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

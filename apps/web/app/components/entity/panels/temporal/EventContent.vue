<script lang="ts" setup>
  /**
   * EventContent — renders a calendar event's location preview + notes.
   *
   * AI entity/tag suggestions are now surfaced in the right sidebar
   * (see EntityAISuggestionsPanel mounted from EntityRightSidebar).
   */

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const locationValue = computed(() => (item.value.location || '').trim())
  const hasLocation = computed(() => !!locationValue.value)

  const isUrl = computed(() => /^https?:\/\//i.test(locationValue.value))

  const isMapUrl = computed(() =>
    /google\.com\/maps|maps\.google|maps\.app\.goo\.gl|goo\.gl\/maps|apple\.com\/maps/i.test(locationValue.value),
  )

  const isConferenceUrl = computed(
    () => !isMapUrl.value && isUrl.value && /zoom\.us|meet\.google|teams\.microsoft|webex/i.test(locationValue.value),
  )

  const locationIcon = computed(() => {
    if (isMapUrl.value) return 'lucide:map-pin'
    if (isConferenceUrl.value) return 'lucide:video'
    if (isUrl.value) return 'lucide:link'
    return 'lucide:map-pin'
  })

  const mapUrlDomain = computed(() => {
    try {
      return new URL(locationValue.value).hostname.replace(/^www\./, '')
    } catch {
      return locationValue.value
    }
  })

  // For plain-text addresses, embed a Google Maps preview (classic output=embed)
  const embedSrc = computed(() => {
    if (!hasLocation.value || isUrl.value) return ''
    return `https://maps.google.com/maps?q=${encodeURIComponent(locationValue.value)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  })

  // "Open in Maps" link for plain-text addresses
  const mapsSearchUrl = computed(() => {
    if (!hasLocation.value || isUrl.value) return ''
    return `https://www.google.com/maps/search/${encodeURIComponent(locationValue.value)}`
  })

  const showPreview = ref(true)

  const isViewMode = computed(() => props.mode === 'view')
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 divide-y divide-border">
    <!-- Location Preview (only when location is set and embeddable) -->
    <div v-if="hasLocation && (isMapUrl || isConferenceUrl || embedSrc)" class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location Preview</p>
        <button
          v-if="isMapUrl || embedSrc"
          class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          @click="showPreview = !showPreview">
          {{ showPreview ? 'Hide' : 'Show' }}
        </button>
      </div>

      <!-- Conference URL display -->
      <a
        v-if="isConferenceUrl"
        :href="item.location"
        target="_blank"
        class="text-sm text-primary hover:underline inline-flex items-center gap-1.5 max-w-full">
        <Icon :name="locationIcon" class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate">{{ item.location }}</span>
        <Icon name="lucide:external-link" class="h-3 w-3 shrink-0 text-muted-foreground" />
      </a>

      <!-- Map Preview -->
      <Transition name="map-reveal">
        <div v-if="showPreview && (isMapUrl || embedSrc)" class="rounded-lg overflow-hidden border border-border">
          <a
            v-if="isMapUrl"
            :href="item.location"
            target="_blank"
            class="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors group">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="lucide:map" class="h-5 w-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium">{{ mapUrlDomain }}</p>
              <p class="text-[10px] text-muted-foreground truncate">{{ item.location }}</p>
            </div>
            <Icon
              name="lucide:external-link"
              class="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
          </a>
          <div v-else-if="embedSrc" class="relative">
            <iframe
              :src="embedSrc"
              class="w-full h-44"
              style="border: 0"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade" />
            <a
              :href="mapsSearchUrl"
              target="_blank"
              class="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Icon name="lucide:external-link" class="h-2.5 w-2.5" />
              Open in Maps
            </a>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Notes / content rich text editor -->
    <div class="flex-1 flex flex-col min-h-0">
      <UiRichTextEditor
        v-if="!isViewMode"
        v-model="item.content"
        placeholder="Add notes, agenda, or action items..."
        class="flex-1 min-h-0 border-none! rounded-none!"
        fill-height
        mentions
        tasklist
        images
        embeds
        tables
        mathematics
        :entity-id="item.id" />
      <div
        v-else-if="item.content"
        class="prose prose-sm max-w-none text-sm text-foreground flex-1 p-4"
        v-html="item.content" />
      <div v-else class="flex-1 flex items-center justify-center p-8 text-muted-foreground/40 text-sm italic">
        No notes
      </div>
    </div>
  </div>
</template>

<style scoped>
  .map-reveal-enter-active,
  .map-reveal-leave-active {
    transition: all 0.25s ease;
    overflow: hidden;
  }
  .map-reveal-enter-from,
  .map-reveal-leave-to {
    opacity: 0;
    max-height: 0;
  }
  .map-reveal-enter-to,
  .map-reveal-leave-from {
    opacity: 1;
    max-height: 300px;
  }
</style>

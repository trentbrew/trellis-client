import type { Ref } from 'vue'
import type { DeckFixedObjectKind, DeckObjectKind, DeckSelection, SlideDefinition } from '~/types/deck'

const OBJECT_LABELS: Record<DeckFixedObjectKind, string> = {
  slide: 'Slide',
  eyebrow: 'Eyebrow',
  title: 'Title',
  body: 'Body',
  queryView: 'Query view',
}

export function deckObjectLabel(objectId: DeckObjectKind, slide?: SlideDefinition | null): string {
  if (objectId.startsWith('object:')) {
    const objectIdValue = objectId.slice('object:'.length)
    const object = slide?.regions.objects?.find((item) => item.id === objectIdValue)
    return object?.block.title || 'HTML embed'
  }
  return OBJECT_LABELS[objectId as DeckFixedObjectKind]
}

export function useDeckSelection(activeSlide: Ref<SlideDefinition | null>) {
  const selection = ref<DeckSelection | null>(null)

  function currentSlideId(): string {
    return activeSlide.value?.entityId ?? ''
  }

  function selectObject(objectId: DeckObjectKind) {
    const slideEntityId = currentSlideId()
    if (!slideEntityId) {
      selection.value = null
      return
    }
    selection.value = { slideEntityId, objectId }
  }

  function selectSlide() {
    selectObject('slide')
  }

  watch(
    () => activeSlide.value?.entityId,
    () => selectSlide(),
    { immediate: true },
  )

  const selectedObjectId = computed<DeckObjectKind>(() => selection.value?.objectId ?? 'slide')
  const selectedLabel = computed(() => deckObjectLabel(selectedObjectId.value, activeSlide.value))
  const announcement = computed(() => {
    if (!activeSlide.value) return ''
    return `Selected ${selectedLabel.value.toLowerCase()} on slide ${activeSlide.value.order || 1}.`
  })

  return {
    selection,
    selectedObjectId,
    selectedLabel,
    announcement,
    selectObject,
    selectSlide,
  }
}

<script setup lang="ts">
  /**
   * Legacy redirect: /types/[id] → /ontologies/{slug} when mappable, else /ontologies.
   */
  import { normalizeOntologySlug, validateOntologySlug } from '~/lib/ontology-reserved-keys'

  definePageMeta({
    title: 'Type Editor',
    layout: 'fullscreen',
    middleware: ['auth'],
  })

  const route = useRoute()
  const { wp } = useWorkspacePath()
  const { customTypes, customTypesLoading } = useInstantData()

  const typeId = computed(() => String(route.params.id || ''))

  const redirectLegacyType = () => {
    const id = typeId.value
    if (!id) {
      void navigateTo(wp('/ontologies'), { replace: true })
      return
    }
    const legacy = (customTypes.value || []).find((t) => t.id === id)
    if (legacy?.name) {
      const slugError = validateOntologySlug(legacy.name)
      const slug = normalizeOntologySlug(legacy.name)
      if (!slugError && slug) {
        void navigateTo(wp(`/ontologies/${slug}`), { replace: true })
        return
      }
    }
    void navigateTo(wp('/ontologies'), { replace: true })
  }

  watch(
    [typeId, customTypesLoading],
    ([, loading]) => {
      if (loading) return
      redirectLegacyType()
    },
    { immediate: true },
  )
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>

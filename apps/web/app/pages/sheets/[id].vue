<script setup lang="ts">
  import SheetProjectionFrame from '~/components/sheet/SheetProjectionFrame.vue'
  import { sheetEntityIdFromSlug, sheetSlugFromEntityId } from '~/lib/sheet-routes'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  const route = useRoute()
  const sheetId = computed(() => {
    const p = route.params.id
    const slug = Array.isArray(p) ? p[0] : p
    return slug ? sheetEntityIdFromSlug(String(slug)) : ''
  })

  const sheetSlug = computed(() => sheetSlugFromEntityId(sheetId.value))

  useHead({ title: () => `${sheetSlug.value} | Sheet` })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <SheetProjectionFrame v-if="sheetId" :sheet-id="sheetId" class="h-full min-h-0" />
  </Page>
</template>

<script setup lang="ts">
  import type { EntityRef } from '~/types/database'

  const props = defineProps<{
    entity: EntityRef
  }>()

  const ENTITY_ICONS: Record<string, string> = {
    task: 'lucide:check-square',
    note: 'lucide:sticky-note',
    event: 'lucide:calendar',
    project: 'lucide:folder-kanban',
    person: 'lucide:user',
    bookmark: 'lucide:bookmark',
    file: 'lucide:file',
    goal: 'lucide:target',
    sprint: 'lucide:zap',
    milestone: 'lucide:flag',
  }

  const icon = computed(() => ENTITY_ICONS[props.entity.type] ?? props.entity.icon ?? 'lucide:link')

  const href = computed(() => {
    const id = props.entity.id.replace(/^entity:/, '')
    return `/workspace?entity=${id}`
  })
</script>

<template>
  <NuxtLink
    :to="href"
    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium no-underline max-w-[200px]"
    :title="entity.title"
  >
    <Icon :name="icon" class="h-3 w-3 shrink-0" />
    <span class="truncate">{{ entity.title }}</span>
  </NuxtLink>
</template>

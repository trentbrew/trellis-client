<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const props = defineProps<{
    item: Entity
  }>()

  defineEmits<{
    click: []
  }>()

  const _config = computed(() => getEntityTypeConfig(props.item.type as any))

  const isOrganization = computed(() => props.item.type === 'organization')

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    client: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    vendor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const avatarColors: Record<string, { bg: string; text: string }> = {
    person: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
    contact: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400' },
    organization: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400' },
    vendor: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  }

  const avatarStyle = computed(() => avatarColors[props.item.type] ?? avatarColors.person!)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', '') }
    catch { return url }
  }

  const getRefCount = (item: any): number => {
    return (item.references || []).filter((r: any) => r.kind === 'entity').length
  }
</script>

<template>
  <UiCard
    class="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50"
    @click="$emit('click')">

    <UiCardHeader class="pb-2">
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <div
          :class="[
            'flex items-center justify-center text-sm font-semibold shrink-0',
            isOrganization ? 'h-10 w-10 rounded-lg' : 'h-10 w-10 rounded-full',
            avatarStyle.bg,
            avatarStyle.text,
          ]">
          <img
            v-if="(item as any).logo || (item as any).avatar"
            :src="(item as any).logo || (item as any).avatar"
            class="h-full w-full object-cover"
            :class="isOrganization ? 'rounded-lg' : 'rounded-full'"
            :alt="item.title"
            @error="($event.target as HTMLImageElement).style.display = 'none'" />
          <template v-else>{{ getInitials(item.title) }}</template>
        </div>

        <!-- Name & subtitle -->
        <div class="min-w-0 flex-1">
          <UiCardTitle class="text-base line-clamp-1 group-hover:text-primary transition-colors">
            {{ item.title }}
          </UiCardTitle>
          <p v-if="(item as any).jobTitle" class="text-xs text-muted-foreground truncate">{{ (item as any).jobTitle }}</p>
          <p v-if="isOrganization && (item as any).industry" class="text-xs text-muted-foreground truncate capitalize">{{ (item as any).industry }}</p>
          <p v-if="(item as any).organization" class="text-xs text-muted-foreground/70 truncate">{{ (item as any).organization }}</p>
          <p v-if="isOrganization && (item as any).website" class="text-xs text-muted-foreground/70 truncate">{{ getDomain((item as any).website) }}</p>
        </div>
      </div>
    </UiCardHeader>

    <UiCardContent class="pt-0 space-y-2">
      <!-- Description -->
      <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>

      <!-- Contact info -->
      <div class="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span v-if="(item as any).email" class="flex items-center gap-1 truncate max-w-[200px]">
          <Icon name="lucide:mail" class="h-3 w-3 shrink-0" />
          {{ (item as any).email }}
        </span>
        <span v-if="(item as any).phone" class="flex items-center gap-1">
          <Icon name="lucide:phone" class="h-3 w-3 shrink-0" />
          {{ (item as any).phone }}
        </span>
      </div>

      <!-- Footer: category + tags/refs -->
      <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
        <span
          v-if="(item as any).category"
          :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
          {{ (item as any).category }}
        </span>
        <div class="flex items-center gap-2">
          <span v-if="getRefCount(item)" class="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
            <Icon name="lucide:link" class="h-3 w-3" />
            {{ getRefCount(item) }}
          </span>
          <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted/80 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
            #{{ tag }}
          </span>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>

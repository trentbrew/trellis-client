<script setup lang="ts">
  import type { SheetColumn } from '~/types/sheet'

  const props = defineProps<{
    column: SheetColumn
    value: unknown
    focused: boolean
    people: Array<{ id: string; title: string }>
    resolveTitle: (id: string | null | undefined) => Promise<string>
  }>()

  const emit = defineEmits<{
    select: [personId: string | null]
  }>()

  const open = ref(false)
  const displayTitle = ref('—')

  watch(
    () => props.value,
    async (val) => {
      const id = val == null || val === '' ? null : String(val)
      displayTitle.value = await props.resolveTitle(id)
    },
    { immediate: true },
  )

  function pick(personId: string | null) {
    emit('select', personId)
    open.value = false
  }
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center justify-between gap-1 truncate text-left text-sm text-muted-foreground hover:text-foreground"
        :class="{ 'outline outline-2 outline-[var(--selection,#6366f1)] outline-offset-[-2px]': focused }"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click.stop
      >
        <span class="truncate">{{ displayTitle }}</span>
        <Icon name="lucide:chevron-down" class="size-3 shrink-0 opacity-50" />
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent class="w-52 p-0" align="start" :side-offset="4" @click.stop>
      <UiCommand class="rounded-lg">
        <UiCommandInput placeholder="Search people…" class="h-8 text-xs" />
        <UiCommandList class="max-h-[240px] overflow-y-auto">
          <UiCommandEmpty class="py-3 text-center text-[11px] text-muted-foreground">No results</UiCommandEmpty>
          <UiCommandGroup>
            <UiCommandItem
              v-for="person in people"
              :key="person.id"
              :value="person.title"
              class="text-xs"
              @select="pick(person.id)"
            >
              {{ person.title }}
            </UiCommandItem>
            <UiCommandSeparator class="my-0.5" />
            <UiCommandItem value="clear" class="text-xs text-muted-foreground" @select="pick(null)">
              (clear)
            </UiCommandItem>
          </UiCommandGroup>
        </UiCommandList>
      </UiCommand>
    </UiPopoverContent>
  </UiPopover>
</template>

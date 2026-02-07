<script lang="ts" setup>
  import { Handle, Position } from '@vue-flow/core'
  import type { OntologyNodeData } from './schema-data'

  defineProps<{
    id: string
    data: OntologyNodeData
    selected?: boolean
  }>()
</script>

<template>
  <div
    class="w-64 rounded-lg border bg-card font-mono shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_2px_rgba(0,0,0,0.02),0_4px_4px_rgba(0,0,0,0.02),0_8px_8px_rgba(0,0,0,0.02),0_16px_16px_rgba(0,0,0,0.02),0_32px_32px_rgba(0,0,0,0.02)]"
    :class="[selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '']">
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-border/80 bg-linear-to-t from-background/70 px-4 py-3 dark:from-background/30">
      <div class="flex items-center gap-2 text-[13px]">
        <Icon v-if="data.icon" :name="data.icon" class="size-4 text-muted-foreground/80" />
        <div>
          <span class="text-muted-foreground/80">/</span>
          <span class="font-medium">{{ data.label }}</span>
        </div>
      </div>
      <span
        v-if="data.subtitle"
        class="text-[10px] text-muted-foreground/50 font-normal">
        {{ data.subtitle }}
      </span>
    </div>

    <!-- Fields -->
    <div class="py-2 text-xs">
      <template v-for="(field, index) in data.fields" :key="field.name">
        <div class="group relative px-4">
          <div
            class="flex items-center justify-between gap-2 border-b border-dashed py-2"
            :class="[index === data.fields.length - 1 ? 'border-b-0' : '']">
            <div class="flex items-center gap-2">
              <span class="truncate" :class="[field.isPrimary ? 'font-semibold' : 'font-medium']">
                {{ field.name }}
              </span>
              <Icon
                v-if="field.isPrimary"
                name="lucide:key-round"
                class="size-3 text-muted-foreground" />
              <span v-else-if="field.isRelation" class="text-muted-foreground/70">(FK)</span>
            </div>
            <span class="text-muted-foreground/60">{{ field.type }}</span>

            <!-- Handles on primary keys and relation fields -->
            <Handle
              v-if="field.isPrimary"
              :id="field.name"
              type="source"
              :position="Position.Left"
              class="size-2.5 rounded-full border-2 border-background transition"
              :class="[selected ? 'bg-primary!' : 'bg-foreground/60!']"
              :connectable="false" />
            <Handle
              v-if="field.isRelation"
              :id="field.name"
              type="target"
              :position="Position.Right"
              class="size-2.5 rounded-full border-2 border-background transition"
              :class="[selected ? 'bg-primary!' : 'bg-foreground/60!']"
              :connectable="false" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

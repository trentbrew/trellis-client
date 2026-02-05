<script setup lang="ts">
  import type { DatabaseSchema, DatabaseField } from '~/types/database'

  export interface CollectionTemplate {
    id: string
    name: string
    description: string
    icon: string
    color: string
    fields: Array<{
      name: string
      type: DatabaseField['type']
      required?: boolean
    }>
  }

  const props = defineProps<{
    compact?: boolean
  }>()

  const emit = defineEmits<{
    select: [template: CollectionTemplate, schema: Partial<DatabaseSchema>]
  }>()

  const templates: CollectionTemplate[] = [
    {
      id: 'project-management',
      name: 'Project Management',
      description: 'Track projects, tasks, and milestones',
      icon: 'lucide:briefcase',
      color: 'text-blue-500',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Status', type: 'select' },
        { name: 'Priority', type: 'select' },
        { name: 'Due Date', type: 'date' },
        { name: 'Assignee', type: 'text' },
      ],
    },
    {
      id: 'personal-finance',
      name: 'Personal Finance',
      description: 'Budget tracking and expense management',
      icon: 'lucide:wallet',
      color: 'text-green-500',
      fields: [
        { name: 'Category', type: 'select', required: true },
        { name: 'Amount', type: 'number', required: true },
        { name: 'Date', type: 'date', required: true },
        { name: 'Type', type: 'select' },
        { name: 'Notes', type: 'text' },
      ],
    },
    {
      id: 'content-calendar',
      name: 'Content Calendar',
      description: 'Plan and schedule content across channels',
      icon: 'lucide:calendar',
      color: 'text-purple-500',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Platform', type: 'select' },
        { name: 'Publish Date', type: 'date' },
        { name: 'Status', type: 'select' },
        { name: 'Author', type: 'text' },
      ],
    },
    {
      id: 'crm',
      name: 'CRM / Contacts',
      description: 'Manage contacts, leads, and relationships',
      icon: 'lucide:users',
      color: 'text-amber-500',
      fields: [
        { name: 'Name', type: 'text', required: true },
        { name: 'Email', type: 'email' },
        { name: 'Company', type: 'text' },
        { name: 'Status', type: 'select' },
        { name: 'Last Contact', type: 'date' },
      ],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Track products, stock levels, and orders',
      icon: 'lucide:package',
      color: 'text-cyan-500',
      fields: [
        { name: 'SKU', type: 'text', required: true },
        { name: 'Name', type: 'text', required: true },
        { name: 'Quantity', type: 'number' },
        { name: 'Price', type: 'number' },
        { name: 'Category', type: 'select' },
      ],
    },
    {
      id: 'knowledge-base',
      name: 'Knowledge Base',
      description: 'Organize documentation and notes',
      icon: 'lucide:book-open',
      color: 'text-rose-500',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Category', type: 'select' },
        { name: 'Tags', type: 'multiselect' },
        { name: 'Content', type: 'text' },
        { name: 'Last Updated', type: 'date' },
      ],
    },
  ]

  const handleSelect = (template: CollectionTemplate) => {
    const schema: Partial<DatabaseSchema> = {
      id: crypto.randomUUID(),
      fields: template.fields.map((field, index) => ({
        id: crypto.randomUUID(),
        name: field.name,
        type: field.type,
        required: field.required || false,
        order: index,
      })),
    }
    emit('select', template, schema)
  }
</script>

<template>
  <div :class="props.compact ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'">
    <button
      v-for="template in templates"
      :key="template.id"
      type="button"
      class="group cursor-pointer rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/30"
      @click="handleSelect(template)">
      <div class="mb-3 flex items-center gap-3">
        <div
          :style="{ backgroundColor: template.color || 'text-gray-500' }"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
          <Icon :name="template.icon" :class="['h-3.5 w-3.5', template.color || 'text-gray-500']" />
        </div>
        <div class="min-w-0">
          <h3 class="font-semibold truncate text-sm">{{ template.name }}</h3>
        </div>
      </div>
      <p class="text-muted-foreground mb-3 text-sm line-clamp-2">{{ template.description }}</p>
      <div class="flex flex-wrap gap-1">
        <span v-for="field in template.fields" :key="field.name" class="bg-muted rounded px-2 py-0.5 text-xs">
          {{ field.name }}
        </span>
      </div>
    </button>
  </div>
</template>

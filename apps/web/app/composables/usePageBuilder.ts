/**
 * Page Builder Composable
 *
 * Provides block-based page composition functionality for the self-building app.
 * Supports various block types including content, data views, embeds, and layout.
 */

import type { DatabaseSchema as _DatabaseSchema } from '~/types/database'

// Block type categories
export type BlockCategory = 'content' | 'data' | 'embed' | 'layout' | 'widget'

// Base block interface
export interface PageBlock {
  id: string
  type: string
  category: BlockCategory
  order: number
  config: Record<string, any>
  children?: PageBlock[]
}

// Block type definition for the picker
export interface BlockTypeDefinition {
  type: string
  label: string
  description: string
  icon: string
  category: BlockCategory
  defaultConfig: Record<string, any>
  configSchema?: {
    fields: Array<{
      key: string
      label: string
      type: 'text' | 'number' | 'boolean' | 'select' | 'collection' | 'color'
      options?: Array<{ value: string; label: string }>
      default?: any
    }>
  }
}

// Page structure
export interface PageDefinition {
  id: string
  title: string
  slug: string
  icon?: string
  description?: string
  blocks: PageBlock[]
  settings: {
    layout: 'full' | 'contained' | 'narrow'
    showTitle: boolean
    showBreadcrumb: boolean
  }
  createdAt: number
  updatedAt: number
}

export function usePageBuilder() {
  const { currentOrganization } = useOrganizations()

  // Built-in block type definitions
  const builtInBlockTypes: BlockTypeDefinition[] = [
    // Content blocks
    {
      type: 'heading',
      label: 'Heading',
      description: 'Section title or header',
      icon: 'lucide:heading',
      category: 'content',
      defaultConfig: { level: 1, text: 'New Heading' },
      configSchema: {
        fields: [
          { key: 'text', label: 'Text', type: 'text' },
          {
            key: 'level',
            label: 'Level',
            type: 'select',
            options: [
              { value: '1', label: 'H1' },
              { value: '2', label: 'H2' },
              { value: '3', label: 'H3' },
            ],
          },
        ],
      },
    },
    {
      type: 'text',
      label: 'Text',
      description: 'Rich text paragraph',
      icon: 'lucide:text',
      category: 'content',
      defaultConfig: { content: '' },
    },
    {
      type: 'image',
      label: 'Image',
      description: 'Single image with optional caption',
      icon: 'lucide:image',
      category: 'content',
      defaultConfig: { src: '', alt: '', caption: '' },
    },
    {
      type: 'divider',
      label: 'Divider',
      description: 'Horizontal line separator',
      icon: 'lucide:minus',
      category: 'content',
      defaultConfig: {},
    },
    {
      type: 'callout',
      label: 'Callout',
      description: 'Highlighted info box',
      icon: 'lucide:alert-circle',
      category: 'content',
      defaultConfig: { type: 'info', title: '', content: '' },
      configSchema: {
        fields: [
          {
            key: 'type',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'info', label: 'Info' },
              { value: 'warning', label: 'Warning' },
              { value: 'success', label: 'Success' },
              { value: 'error', label: 'Error' },
            ],
          },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'content', label: 'Content', type: 'text' },
        ],
      },
    },

    // Data blocks
    {
      type: 'collection-view',
      label: 'Collection View',
      description: 'Display data from a collection',
      icon: 'lucide:database',
      category: 'data',
      defaultConfig: { collectionId: '', viewType: 'table', limit: 10 },
      configSchema: {
        fields: [
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          {
            key: 'viewType',
            label: 'View Type',
            type: 'select',
            options: [
              { value: 'table', label: 'Table' },
              { value: 'cards', label: 'Cards' },
              { value: 'list', label: 'List' },
              { value: 'kanban', label: 'Kanban' },
            ],
          },
          { key: 'limit', label: 'Max Items', type: 'number', default: 10 },
        ],
      },
    },
    {
      type: 'record-detail',
      label: 'Record Detail',
      description: 'Show a single record',
      icon: 'lucide:file-text',
      category: 'data',
      defaultConfig: { collectionId: '', recordId: '' },
    },
    {
      type: 'chart',
      label: 'Chart',
      description: 'Data visualization',
      icon: 'lucide:bar-chart-2',
      category: 'data',
      defaultConfig: { collectionId: '', chartType: 'bar', field: '' },
      configSchema: {
        fields: [
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          {
            key: 'chartType',
            label: 'Chart Type',
            type: 'select',
            options: [
              { value: 'bar', label: 'Bar' },
              { value: 'line', label: 'Line' },
              { value: 'pie', label: 'Pie' },
              { value: 'donut', label: 'Donut' },
            ],
          },
        ],
      },
    },

    // Embed blocks
    {
      type: 'iframe',
      label: 'Embed',
      description: 'Embed external content',
      icon: 'lucide:frame',
      category: 'embed',
      defaultConfig: { url: '', height: 400 },
      configSchema: {
        fields: [
          { key: 'url', label: 'URL', type: 'text' },
          { key: 'height', label: 'Height (px)', type: 'number', default: 400 },
        ],
      },
    },
    {
      type: 'video',
      label: 'Video',
      description: 'YouTube or Vimeo embed',
      icon: 'lucide:play-circle',
      category: 'embed',
      defaultConfig: { url: '' },
    },
    {
      type: 'map',
      label: 'Map',
      description: 'Interactive map',
      icon: 'lucide:map',
      category: 'embed',
      defaultConfig: { lat: 0, lng: 0, zoom: 12 },
    },

    // Layout blocks
    {
      type: 'columns',
      label: 'Columns',
      description: 'Multi-column layout',
      icon: 'lucide:columns',
      category: 'layout',
      defaultConfig: { count: 2, gap: 'md' },
      configSchema: {
        fields: [
          {
            key: 'count',
            label: 'Columns',
            type: 'select',
            options: [
              { value: '2', label: '2 Columns' },
              { value: '3', label: '3 Columns' },
              { value: '4', label: '4 Columns' },
            ],
          },
          {
            key: 'gap',
            label: 'Gap',
            type: 'select',
            options: [
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ],
          },
        ],
      },
    },
    {
      type: 'tabs',
      label: 'Tabs',
      description: 'Tabbed content sections',
      icon: 'lucide:folder',
      category: 'layout',
      defaultConfig: { tabs: [{ id: '1', label: 'Tab 1' }] },
    },
    {
      type: 'accordion',
      label: 'Accordion',
      description: 'Collapsible sections',
      icon: 'lucide:chevrons-down',
      category: 'layout',
      defaultConfig: { items: [] },
    },

    // Widget blocks
    {
      type: 'stat-card',
      label: 'Stat Card',
      description: 'Key metric display',
      icon: 'lucide:hash',
      category: 'widget',
      defaultConfig: { title: '', value: '', collectionId: '', aggregation: 'count' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          {
            key: 'aggregation',
            label: 'Aggregation',
            type: 'select',
            options: [
              { value: 'count', label: 'Count' },
              { value: 'sum', label: 'Sum' },
              { value: 'avg', label: 'Average' },
              { value: 'min', label: 'Min' },
              { value: 'max', label: 'Max' },
            ],
          },
        ],
      },
    },
    {
      type: 'recent-activity',
      label: 'Recent Activity',
      description: 'Activity feed',
      icon: 'lucide:activity',
      category: 'widget',
      defaultConfig: { limit: 5 },
    },
    {
      type: 'quick-links',
      label: 'Quick Links',
      description: 'Navigation shortcuts',
      icon: 'lucide:link',
      category: 'widget',
      defaultConfig: { links: [] },
    },
  ]

  // Group block types by category
  const blockTypesByCategory = computed(() => {
    const grouped: Record<string, BlockTypeDefinition[]> = {
      content: [],
      data: [],
      embed: [],
      layout: [],
      widget: [],
    }

    for (const blockType of builtInBlockTypes) {
      const category = grouped[blockType.category]
      if (category) {
        category.push(blockType)
      }
    }

    return grouped
  })

  // All available block types
  const allBlockTypes = computed(() => builtInBlockTypes)

  // Create a new block from a type definition
  const createBlockFromType = (typeDef: BlockTypeDefinition): PageBlock => {
    return {
      id: crypto.randomUUID(),
      type: typeDef.type,
      category: typeDef.category,
      order: 0,
      config: { ...typeDef.defaultConfig },
    }
  }

  // Create default page definition
  const createDefaultPage = (title: string = 'New Page'): PageDefinition => {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return {
      id: crypto.randomUUID(),
      title,
      slug,
      icon: 'lucide:file',
      blocks: [],
      settings: {
        layout: 'contained',
        showTitle: true,
        showBreadcrumb: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  // Validate page structure
  const validatePage = (page: PageDefinition): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!page.title?.trim()) {
      errors.push('Page title is required')
    }

    if (!page.slug?.trim()) {
      errors.push('Page slug is required')
    }

    // Check for duplicate block IDs
    const blockIds = new Set<string>()
    const checkBlocks = (blocks: PageBlock[]) => {
      for (const block of blocks) {
        if (blockIds.has(block.id)) {
          errors.push(`Duplicate block ID: ${block.id}`)
        }
        blockIds.add(block.id)
        if (block.children) {
          checkBlocks(block.children)
        }
      }
    }
    checkBlocks(page.blocks)

    return { valid: errors.length === 0, errors }
  }

  // Serialize page to JSON-LD for storage
  const serializePageToJsonLd = (page: PageDefinition): object => {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        page: 'https://cal.app/ontology/page#',
      },
      '@type': 'page:Page',
      '@id': `page:${page.id}`,
      'page:title': page.title,
      'page:slug': page.slug,
      'page:icon': page.icon,
      'page:description': page.description,
      'page:blocks': page.blocks.map((block) => ({
        '@type': `page:Block`,
        'page:blockType': block.type,
        'page:category': block.category,
        'page:order': block.order,
        'page:config': block.config,
        ...(block.children && {
          'page:children': block.children.map((child) => ({
            '@type': 'page:Block',
            'page:blockType': child.type,
            'page:category': child.category,
            'page:order': child.order,
            'page:config': child.config,
          })),
        }),
      })),
      'page:settings': page.settings,
      'page:createdAt': page.createdAt,
      'page:updatedAt': page.updatedAt,
    }
  }

  return {
    // Block types
    builtInBlockTypes,
    blockTypesByCategory,
    allBlockTypes,

    // Block operations
    createBlockFromType,

    // Page operations
    createDefaultPage,
    validatePage,
    serializePageToJsonLd,

    // Context
    currentOrganization,
  }
}

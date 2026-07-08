import type { SharedBlockDefinition, SharedBlockKind } from './types'

export const SHARED_BLOCK_REGISTRY: SharedBlockDefinition[] = [
  {
    kind: 'html',
    label: 'HTML embed',
    description: 'Sandboxed custom HTML block',
    icon: 'lucide:code-xml',
    group: 'Compute',
    accent: '#ff8a4c',
    capabilities: ['sourceEditable', 'sandboxed', 'supportsDeckMotion', 'supportsThumbnail'],
  },
  {
    kind: 'mermaid',
    label: 'Mermaid diagram',
    description: 'Diagram source with rendered preview',
    icon: 'lucide:workflow',
    group: 'Compute',
    accent: '#22d3ee',
    capabilities: ['sourceEditable', 'supportsDeckMotion', 'supportsThumbnail'],
  },
  {
    kind: 'code',
    label: 'Code block',
    description: 'Syntax-highlighted source text',
    icon: 'lucide:code',
    group: 'Text',
    accent: '#8b5cf6',
    capabilities: ['sourceEditable', 'supportsDeckMotion', 'supportsThumbnail'],
  },
  {
    kind: 'queryView',
    label: 'Query view',
    description: 'Live graph-backed projection',
    icon: 'lucide:database',
    group: 'Data',
    accent: '#34d399',
    capabilities: ['liveData', 'supportsDeckMotion', 'supportsThumbnail'],
  },
  {
    kind: 'sheetRange',
    label: 'Sheet range',
    description: 'Live transclusion from a sheet',
    icon: 'lucide:table-2',
    group: 'Data',
    accent: '#34d399',
    capabilities: ['liveData', 'supportsDeckMotion', 'supportsThumbnail'],
  },
  {
    kind: 'entity',
    label: 'Entity',
    description: 'Live entity card embed',
    icon: 'lucide:box',
    group: 'Data',
    accent: '#8b5cf6',
    capabilities: ['liveData', 'supportsThumbnail'],
  },
  {
    kind: 'file',
    label: 'File',
    description: 'File attachment or preview',
    icon: 'lucide:file',
    group: 'Media',
    accent: '#9a94aa',
    capabilities: ['supportsThumbnail'],
  },
  {
    kind: 'bookmark',
    label: 'Bookmark',
    description: 'Saved web reference',
    icon: 'lucide:bookmark',
    group: 'Media',
    accent: '#f8c471',
    capabilities: ['supportsThumbnail'],
  },
]

export function getSharedBlockDefinition(kind: SharedBlockKind): SharedBlockDefinition | undefined {
  return SHARED_BLOCK_REGISTRY.find((block) => block.kind === kind)
}

export const HTML_BLOCK_DEFINITION = getSharedBlockDefinition('html')!

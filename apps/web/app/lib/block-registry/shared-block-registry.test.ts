import { describe, expect, test } from 'vitest'
import { getSharedBlockDefinition, SHARED_BLOCK_REGISTRY } from './registry'

describe('shared block registry', () => {
  test('defines the shared P0 embed vocabulary', () => {
    expect(SHARED_BLOCK_REGISTRY.map((block) => block.kind)).toEqual([
      'html',
      'mermaid',
      'code',
      'queryView',
      'sheetRange',
      'entity',
      'file',
      'bookmark',
    ])
  })

  test('marks html as sandboxed and source-editable', () => {
    const html = getSharedBlockDefinition('html')
    expect(html?.capabilities).toContain('sandboxed')
    expect(html?.capabilities).toContain('sourceEditable')
    expect(html?.label).toBe('HTML embed')
  })
})

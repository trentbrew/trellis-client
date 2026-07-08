// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MIN_SUMMARY_SOURCE_LENGTH,
  resolveSummarySource,
  resolveSummaryText,
} from './useEntitySummary'

describe('useEntitySummary source resolution', () => {
  it('uses content for note and page types', () => {
    expect(resolveSummarySource({ id: 'a', type: 'note' })).toBe('content')
    expect(resolveSummarySource({ id: 'a', type: 'page' })).toBe('content')
  })

  it('uses description for non-document types', () => {
    expect(resolveSummarySource({ id: 'a', type: 'task' })).toBe('description')
    expect(resolveSummarySource({ id: 'a', type: 'person' })).toBe('description')
  })

  it('strips HTML from content for document types', () => {
    const html = '<p>Hello <strong>world</strong></p><p>Second paragraph with enough length to summarize well.</p>'
    const text = resolveSummaryText({ id: 'a', type: 'note', content: html })
    expect(text).not.toContain('<')
    expect(text).toContain('Hello')
    expect(text).toContain('Second paragraph')
  })

  it('strips HTML from description for task types', () => {
    const text = resolveSummaryText({
      id: 'a',
      type: 'task',
      description: '<p>Task notes here with sufficient detail for the summarizer pipeline.</p>',
      content: '<p>ignored body</p>',
    })
    expect(text).toContain('Task notes')
    expect(text).not.toContain('ignored body')
  })

  it('exports minimum source length threshold', () => {
    expect(MIN_SUMMARY_SOURCE_LENGTH).toBe(120)
  })
})

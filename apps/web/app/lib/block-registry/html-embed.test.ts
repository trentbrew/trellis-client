import { describe, expect, test } from 'vitest'
import {
  createDeckHtmlObject,
  createHtmlEmbedConfig,
  htmlEmbedIframeSandbox,
  htmlEmbedIframeTitle,
  htmlSourceContainsScript,
  isLikelyHtmlEmbedSource,
} from './html-embed'

describe('html embed helpers', () => {
  test('creates strict default html embed config', () => {
    const config = createHtmlEmbedConfig()
    expect(config.kind).toBe('html')
    expect(config.safety).toEqual({ allowScripts: false, trusted: false })
    expect(config.source).toContain('HTML embed')
  })

  test('keeps iframe sandbox restrictive', () => {
    expect(htmlEmbedIframeSandbox()).toBe('')
    expect(htmlEmbedIframeTitle({ title: '' })).toBe('HTML embed preview')
  })

  test('detects scripts and likely html sources', () => {
    expect(htmlSourceContainsScript('<div><script>alert(1)</script></div>')).toBe(true)
    expect(htmlSourceContainsScript('<section>No scripts</section>')).toBe(false)
    expect(isLikelyHtmlEmbedSource('<iframe src="https://example.com"></iframe>')).toBe(true)
    expect(isLikelyHtmlEmbedSource('plain text')).toBe(false)
  })

  test('creates a default deck html object', () => {
    const object = createDeckHtmlObject({ id: 'html-test' })
    expect(object.id).toBe('html-test')
    expect(object.kind).toBe('html')
    expect(object.frame.width).toBeGreaterThan(0)
    expect(object.block.safety.allowScripts).toBe(false)
  })
})

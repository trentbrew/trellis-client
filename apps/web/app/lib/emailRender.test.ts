import { describe, expect, test } from 'vitest'
import {
  buildEmailSrcdoc,
  isEmailTrackingPixelUrl,
  sanitizeEmailHtml,
} from './emailRender'

describe('emailRender', () => {
  test('detects airtable tracking pixels by host', () => {
    expect(
      isEmailTrackingPixelUrl(
        'https://links1.airtable.com/q/YrQD1jHbWnYG4soWReLO-Q~~/pixel',
      ),
    ).toBe(true)
    expect(isEmailTrackingPixelUrl('https://cdn.example.com/logo.png')).toBe(false)
  })

  test('neutralizes tracking pixels and cid images', () => {
    const html = sanitizeEmailHtml(`
      <img src="https://links1.airtable.com/q/pixel" width="1" height="1" />
      <img src="cid:abc@mail" alt="inline" />
      <img src="https://cdn.example.com/hero.png" alt="hero" />
    `)

    expect(html).toContain('data:image/gif;base64,')
    expect(html).not.toContain('links1.airtable.com')
    expect(html).not.toContain('cid:abc@mail')
    expect(html).toContain('https://cdn.example.com/hero.png')
  })

  test('strips executable markup from email bodies', () => {
    const html = sanitizeEmailHtml(`
      <div onclick="alert(1)">Hi</div>
      <script>alert(1)</script>
      <script src="https://evil.example/x.js"></script>
      <iframe src="https://evil.example"></iframe>
      <object data="x"></object>
    `)

    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<iframe/i)
    expect(html).not.toMatch(/onclick/i)
    expect(html).toContain('Hi')
  })

  test('wraps sanitized email html with script-blocking csp', () => {
    const srcdoc = buildEmailSrcdoc({
      bodyHtml: '<p>Hello</p><script>alert(1)</script>',
    })

    expect(srcdoc).toContain("script-src 'none'")
    expect(srcdoc).toContain('<p>Hello</p>')
    expect(srcdoc).not.toMatch(/<script/i)
  })
})

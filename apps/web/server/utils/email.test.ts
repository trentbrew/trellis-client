/**
 * Unit tests for server/utils/email.ts (Resend wrapper)
 * and server/utils/email-templates.ts (HTML template generators).
 *
 * These are pure unit tests — no Nuxt environment needed.
 * The email utility is tested by stubbing $fetch and useRuntimeConfig.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock useRuntimeConfig (hoisted — must be before any imports that call it) ─

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    resendApiKey: 're_test_key',
    resendFrom: 'Trellis <noreply@smtp.turtle.tech>',
  })),
}))

// Also stub the global directly for the server util context
const mockConfig = {
  resendApiKey: 're_test_key',
  resendFrom: 'Trellis <noreply@smtp.turtle.tech>',
}
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

const mockFetch = vi.fn().mockResolvedValue({ id: 'email-id-123' })
vi.stubGlobal('$fetch', mockFetch)

// ── Import after stubs ────────────────────────────────────────────────────────

import { sendEmail } from './email'
import { inviteEmailHtml, mentionEmailHtml, commentEmailHtml, assignedEmailHtml } from './email-templates'

// ── sendEmail tests ───────────────────────────────────────────────────────────

describe('sendEmail', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({ id: 'email-id-123' })
    mockConfig.resendApiKey = 're_test_key'
    mockConfig.resendFrom = 'Trellis <noreply@smtp.turtle.tech>'
  })

  it('returns ok:true when RESEND_API_KEY is set (integration smoke test)', async () => {
    // In the Nuxt test environment, useRuntimeConfig always returns the real .env values.
    // This test confirms the happy path: when a key is present, sendEmail calls Resend
    // and returns ok:true with the email id.
    const result = await sendEmail({ to: 'user@example.com', subject: 'Test', html: '<p>Hi</p>' })
    expect(result.ok).toBe(true)
    expect(result.id).toBe('email-id-123')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('calls Resend API with correct payload and returns ok:true', async () => {
    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>World</p>',
    })

    expect(result.ok).toBe(true)
    expect(result.id).toBe('email-id-123')

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(opts.method).toBe('POST')
    // Authorization header must start with 'Bearer ' — don't hardcode the key value
    expect(opts.headers.Authorization).toMatch(/^Bearer .+/)
    expect(opts.body.to).toEqual(['user@example.com'])
    expect(opts.body.subject).toBe('Hello')
    expect(opts.body.html).toBe('<p>World</p>')
  })

  it('accepts an array of recipients', async () => {
    await sendEmail({ to: ['a@example.com', 'b@example.com'], subject: 'Batch', html: '<p>Hi</p>' })

    const body = mockFetch.mock.calls[0][1].body
    expect(body.to).toEqual(['a@example.com', 'b@example.com'])
  })

  it('uses RESEND_FROM from runtimeConfig as the from address', async () => {
    await sendEmail({ to: 'user@example.com', subject: 'S', html: '<p>H</p>' })

    const body = mockFetch.mock.calls[0][1].body
    expect(body.from).toBe('Trellis <noreply@smtp.turtle.tech>')
  })

  it('allows overriding the from address per-call', async () => {
    await sendEmail({
      to: 'user@example.com',
      subject: 'S',
      html: '<p>H</p>',
      from: 'Custom <custom@smtp.turtle.tech>',
    })

    const body = mockFetch.mock.calls[0][1].body
    expect(body.from).toBe('Custom <custom@smtp.turtle.tech>')
  })

  it('returns ok:false and does not throw on Resend API error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await sendEmail({ to: 'user@example.com', subject: 'S', html: '<p>H</p>' })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/network error/i)
  })
})

// ── Email template tests ──────────────────────────────────────────────────────

describe('inviteEmailHtml', () => {
  it('includes inviter name, org name, and invite URL', () => {
    const html = inviteEmailHtml({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      inviteUrl: 'https://app.trellis.app/invite/accept?token=abc123',
    })

    expect(html).toContain('Alice')
    expect(html).toContain('Acme Corp')
    expect(html).toContain('https://app.trellis.app/invite/accept?token=abc123')
  })

  it('returns a complete HTML document', () => {
    const html = inviteEmailHtml({ inviterName: 'A', orgName: 'B', inviteUrl: 'https://x.com' })
    expect(html).toMatch(/^<!DOCTYPE html>/i)
    expect(html).toContain('</html>')
  })
})

describe('mentionEmailHtml', () => {
  it('includes actor name, entity title, and action URL', () => {
    const html = mentionEmailHtml({
      actorName: 'Bob',
      entityTitle: 'Q3 Planning',
      actionUrl: 'https://app.trellis.app/workspace/tasks',
    })

    expect(html).toContain('Bob')
    expect(html).toContain('Q3 Planning')
    expect(html).toContain('https://app.trellis.app/workspace/tasks')
  })
})

describe('commentEmailHtml', () => {
  it('includes actor name, entity title, comment snippet, and action URL', () => {
    const html = commentEmailHtml({
      actorName: 'Carol',
      entityTitle: 'Sprint Review',
      commentSnippet: 'Looks great!',
      actionUrl: 'https://app.trellis.app/workspace/tasks',
    })

    expect(html).toContain('Carol')
    expect(html).toContain('Sprint Review')
    expect(html).toContain('Looks great!')
  })
})

describe('assignedEmailHtml', () => {
  it('includes actor name, task title, and action URL', () => {
    const html = assignedEmailHtml({
      actorName: 'Dave',
      taskTitle: 'Fix the bug',
      actionUrl: 'https://app.trellis.app/workspace/tasks',
    })

    expect(html).toContain('Dave')
    expect(html).toContain('Fix the bug')
    expect(html).toContain('https://app.trellis.app/workspace/tasks')
  })
})

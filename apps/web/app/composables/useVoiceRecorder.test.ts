import { describe, expect, test } from 'vitest'
import { formatDurationMs } from './useVoiceRecorder'

describe('formatDurationMs', () => {
  test('formats zero', () => {
    expect(formatDurationMs(0)).toBe('0:00')
  })

  test('formats seconds with padding', () => {
    expect(formatDurationMs(5000)).toBe('0:05')
    expect(formatDurationMs(65000)).toBe('1:05')
  })

  test('floors partial seconds', () => {
    expect(formatDurationMs(1999)).toBe('0:01')
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isSidecarEnabled } from './sidecar-enabled'

describe('isSidecarEnabled', () => {
  it('returns false when TRELLIS_SIDECAR is unset', () => {
    const prev = process.env.TRELLIS_SIDECAR
    delete process.env.TRELLIS_SIDECAR
    expect(isSidecarEnabled()).toBe(false)
    if (prev !== undefined) process.env.TRELLIS_SIDECAR = prev
  })

  it('returns true when TRELLIS_SIDECAR=1', () => {
    const prev = process.env.TRELLIS_SIDECAR
    process.env.TRELLIS_SIDECAR = '1'
    expect(isSidecarEnabled()).toBe(true)
    if (prev === undefined) delete process.env.TRELLIS_SIDECAR
    else process.env.TRELLIS_SIDECAR = prev
  })
})

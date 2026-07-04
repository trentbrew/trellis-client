// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, afterEach } from 'vitest'

import { resolveVcsRoot } from './vcs-root'

describe('resolveVcsRoot', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('finds .trellis/ops.json by walking up from nested cwd', () => {
    const root = mkdtempSync(join(tmpdir(), 'vcs-root-'))
    dirs.push(root)
    mkdirSync(join(root, '.trellis'), { recursive: true })
    writeFileSync(join(root, '.trellis', 'ops.json'), '[]')

    const nested = join(root, 'apps', 'web')
    mkdirSync(nested, { recursive: true })

    expect(resolveVcsRoot(undefined, nested)).toBe(root)
  })

  it('respects explicit TRELLIS_VCS_ROOT when valid', () => {
    const root = mkdtempSync(join(tmpdir(), 'vcs-root-explicit-'))
    dirs.push(root)
    mkdirSync(join(root, '.trellis'), { recursive: true })
    writeFileSync(join(root, '.trellis', 'ops.json'), '[]')

    expect(resolveVcsRoot(root, '/tmp/nowhere')).toBe(root)
  })

  it('returns null when no repo found', () => {
    const empty = mkdtempSync(join(tmpdir(), 'vcs-root-empty-'))
    dirs.push(empty)
    expect(resolveVcsRoot(undefined, empty)).toBeNull()
  })
})

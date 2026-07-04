import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function resolveVcsRoot(explicit?: string, startDir = process.cwd()): string | null {
  if (explicit && existsSync(join(explicit, '.trellis', 'ops.json'))) {
    return explicit
  }

  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, '.trellis', 'ops.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return null
}

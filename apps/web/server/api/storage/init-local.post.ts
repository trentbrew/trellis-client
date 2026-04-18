/**
 * POST /api/storage/init-local
 *
 * Creates the ~/.nodebook directory structure on the local machine.
 * Called once during onboarding / first app boot in local mode.
 *
 * Returns: { created: boolean, path: string }
 */

import { defineEventHandler } from 'h3'
import { mkdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const DIRS = [
  join(homedir(), '.nodebook'),
  join(homedir(), '.nodebook', 'files'),
  join(homedir(), '.nodebook', 'files', 'entities'),
  join(homedir(), '.nodebook', 'files', 'thumbnails'),
]

export default defineEventHandler(async () => {
  let created = false

  for (const dir of DIRS) {
    try {
      await access(dir)
    } catch {
      await mkdir(dir, { recursive: true })
      created = true
    }
  }

  return {
    created,
    path: DIRS[0],
    dirs: DIRS,
  }
})

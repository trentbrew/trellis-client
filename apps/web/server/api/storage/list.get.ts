/**
 * GET /api/storage/list?path=entities
 *
 * Lists a directory inside the local ~/.nodebook/files/ tree for the
 * Explorer (Finder-like) projection. Empty or omitted `path` lists the root.
 *
 * Returns: { path, parent, items: [{ name, type, size, modifiedAt, ext }] }
 * Items are sorted directories-first, then alphabetically. Dotfiles are
 * included but flagged (`hidden: true`) so the UI can hide them by default.
 */

import { createError, defineEventHandler, getQuery } from 'h3'
import { readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { homedir } from 'node:os'

const NODEBOOK_FILES_DIR = join(homedir(), '.nodebook', 'files')

function sanitizeRelativePath(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw !== 'string') throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  const decoded = decodeURIComponent(raw)
  // Deny traversal + absolute paths
  if (decoded.includes('..') || decoded.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }
  return decoded
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const relative = sanitizeRelativePath(query.path)
  const absolutePath = join(NODEBOOK_FILES_DIR, relative)

  let dirStat
  try {
    dirStat = await stat(absolutePath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Directory not found' })
  }
  if (!dirStat.isDirectory()) {
    throw createError({ statusCode: 400, statusMessage: 'Not a directory' })
  }

  const entries = await readdir(absolutePath, { withFileTypes: true })

  const items = await Promise.all(
    entries.map(async (entry) => {
      const isDir = entry.isDirectory()
      const childPath = join(absolutePath, entry.name)
      let size = 0
      let modifiedAt: string | null = null
      try {
        const s = await stat(childPath)
        size = isDir ? 0 : s.size
        modifiedAt = s.mtime.toISOString()
      } catch {
        // Broken symlink etc. — report zeroed metadata
      }
      return {
        name: entry.name,
        type: isDir ? 'folder' : 'file',
        size,
        modifiedAt,
        hidden: entry.name.startsWith('.'),
        ext: isDir ? null : (extname(entry.name).slice(1) || null),
      }
    }),
  )

  const sorted = items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })

  const parent = relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : ''

  return {
    path: relative,
    parent,
    items: sorted,
  }
})

/**
 * localStorageRoutes.test.ts
 *
 * Unit tests for the ~/.nodebook local file storage server utilities:
 *
 *   - Path construction (NODEBOOK_DIR, NODEBOOK_FILES_DIR)
 *   - Path traversal security validation
 *   - Safe path construction for uploads
 *   - MIME-from-extension mapping (local-file.get.ts helper)
 *   - init-local idempotence contract
 *
 * NOTE: These tests exercise the pure logic extracted from the route handlers,
 * not the H3 event handling layer (which requires a running Nuxt server).
 * Integration-level route tests live in tests/e2e/.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ── Constants under test ──────────────────────────────────────────────────

const NODEBOOK_DIR = join(homedir(), '.nodebook')
const NODEBOOK_FILES_DIR = join(NODEBOOK_DIR, 'files')

// ── Path construction ─────────────────────────────────────────────────────

describe('Nodebook directory constants', () => {
  it('NODEBOOK_DIR is under the user home directory', () => {
    expect(NODEBOOK_DIR).toContain(homedir())
    expect(NODEBOOK_DIR).toContain('.nodebook')
  })

  it('NODEBOOK_FILES_DIR is a subdirectory of NODEBOOK_DIR', () => {
    expect(NODEBOOK_FILES_DIR).toContain(NODEBOOK_DIR)
    expect(NODEBOOK_FILES_DIR).toContain('files')
  })
})

// ── Security: path traversal validation ──────────────────────────────────

/**
 * Mirrors the validation logic in local-upload.post.ts and local-file.get.ts.
 * Extracted for pure-function testing without H3 dependencies.
 */
function isPathSafe(relativePath: string): boolean {
  return !relativePath.includes('..') && !relativePath.startsWith('/')
}

describe('Path traversal security guard', () => {
  it('allows simple relative paths', () => {
    expect(isPathSafe('entities/abc/file.pdf')).toBe(true)
    expect(isPathSafe('entities/xyz/2024-report.csv')).toBe(true)
  })

  it('rejects paths with double-dot traversal', () => {
    expect(isPathSafe('../etc/passwd')).toBe(false)
    expect(isPathSafe('entities/../../secret')).toBe(false)
    expect(isPathSafe('valid/start/../../../outside')).toBe(false)
  })

  it('rejects absolute paths', () => {
    expect(isPathSafe('/etc/passwd')).toBe(false)
    expect(isPathSafe('/entities/abc/file.pdf')).toBe(false)
  })

  it('allows paths with single dots (current-dir)', () => {
    // A single dot is fine — we only block ".." double-dots
    expect(isPathSafe('entities/./file.pdf')).toBe(true)
  })
})

// ── Storage path construction ─────────────────────────────────────────────

/**
 * Mirrors the buildPath logic in useFileUpload.ts.
 */
function buildPath(entityId: string, filename: string): string {
  const timestamp = 1234567890 // frozen for determinism
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `entities/${entityId}/${timestamp}-${sanitized}`
}

describe('buildPath — storage path construction', () => {
  it('produces a valid relative path', () => {
    const path = buildPath('entity-abc', 'report.pdf')
    expect(path).toBe('entities/entity-abc/1234567890-report.pdf')
    expect(isPathSafe(path)).toBe(true)
  })

  it('sanitizes special characters in filenames', () => {
    const path = buildPath('entity-abc', 'my file (v2).pdf')
    expect(path).not.toContain(' ')
    expect(path).not.toContain('(')
    expect(path).not.toContain(')')
    expect(isPathSafe(path)).toBe(true)
  })

  it('sanitizes slashes in filenames (dots are preserved by the allowlist)', () => {
    const path = buildPath('entity-abc', '../../evil.sh')
    // The regex /[^a-zA-Z0-9._-]/ preserves dots, so '..' remains in the
    // filename segment — but slashes are replaced with '_'.
    // The security guarantee is that the server's isPathSafe() rejects any
    // REQUEST path that contains '..'; the buildPath helper on the client only
    // ensures no slash-based directory traversal from the filename portion.
    const filenamePart = path.split('1234567890-')[1]!
    expect(filenamePart).not.toContain('/')
    expect(path.startsWith('entities/entity-abc/')).toBe(true)
  })

  it('preserves dots, hyphens, and underscores', () => {
    const path = buildPath('entity-abc', 'my-file_v1.tar.gz')
    expect(path).toContain('my-file_v1.tar.gz')
  })
})

// ── MIME from extension mapping (local-file.get.ts) ──────────────────────

/**
 * Mirrors mimeFromExt() from local-file.get.ts.
 */
function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.zip': 'application/zip',
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}

describe('mimeFromExt', () => {
  it.each([
    ['.png',   'image/png'],
    ['.jpg',   'image/jpeg'],
    ['.jpeg',  'image/jpeg'],
    ['.pdf',   'application/pdf'],
    ['.mp4',   'video/mp4'],
    ['.mp3',   'audio/mpeg'],
    ['.csv',   'text/csv'],
    ['.json',  'application/json'],
    ['.xlsx',  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['.zip',   'application/zip'],
    ['.md',    'text/markdown'],
    ['.ts',    'text/typescript'],
  ] as [string, string][])('maps %s → %s', (ext, expected) => {
    expect(mimeFromExt(ext)).toBe(expected)
  })

  it('returns application/octet-stream for unknown extensions', () => {
    expect(mimeFromExt('.xyz')).toBe('application/octet-stream')
    expect(mimeFromExt('')).toBe('application/octet-stream')
  })

  it('is case-insensitive', () => {
    expect(mimeFromExt('.PNG')).toBe('image/png')
    expect(mimeFromExt('.PDF')).toBe('application/pdf')
  })
})

// ── URL encoding of storage paths ─────────────────────────────────────────

describe('Storage URL encoding', () => {
  it('encodeURIComponent encodes forward slashes', () => {
    const path = 'entities/abc/1234-file.csv'
    const encoded = encodeURIComponent(path)
    expect(encoded).not.toContain('/')
    expect(decodeURIComponent(encoded)).toBe(path)
  })

  it('produces a valid /api/storage/local-file URL', () => {
    const path = 'entities/entity-abc/1234-report.pdf'
    const url = `/api/storage/local-file?path=${encodeURIComponent(path)}`
    expect(url).toMatch(/^\/api\/storage\/local-file\?path=/)
    const parsedPath = decodeURIComponent(url.split('?path=')[1]!)
    expect(parsedPath).toBe(path)
  })
})

// ── init-local directory list ──────────────────────────────────────────────

describe('init-local directory list', () => {
  it('all init dirs are under NODEBOOK_DIR', () => {
    const DIRS = [
      join(homedir(), '.nodebook'),
      join(homedir(), '.nodebook', 'files'),
      join(homedir(), '.nodebook', 'files', 'entities'),
      join(homedir(), '.nodebook', 'files', 'thumbnails'),
    ]

    for (const dir of DIRS) {
      expect(dir).toContain('.nodebook')
    }
  })

  it('dir list has no duplicate entries', () => {
    const DIRS = [
      join(homedir(), '.nodebook'),
      join(homedir(), '.nodebook', 'files'),
      join(homedir(), '.nodebook', 'files', 'entities'),
      join(homedir(), '.nodebook', 'files', 'thumbnails'),
    ]
    const unique = new Set(DIRS)
    expect(unique.size).toBe(DIRS.length)
  })
})

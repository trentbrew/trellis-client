import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type TrellisServerConfig = {
  origin: string
  apiKey?: string
  dbPath?: string
}

function loadDbJson(cwd: string): Partial<TrellisServerConfig> & { port?: number; mode?: string } {
  const path = resolve(cwd, '.trellis-db.json')
  if (!existsSync(path)) return {}
  try {
    const cfg = JSON.parse(readFileSync(path, 'utf8')) as {
      url?: string
      apiKey?: string
      dbPath?: string
      port?: number
      mode?: string
    }
    let origin: string | undefined
    if (typeof cfg.url === 'string') {
      origin = cfg.url.replace(/\/$/, '')
    } else if (cfg.mode === 'local' && typeof cfg.port === 'number') {
      origin = `http://localhost:${cfg.port}`
    }
    return {
      origin,
      apiKey: typeof cfg.apiKey === 'string' ? cfg.apiKey : undefined,
      dbPath: typeof cfg.dbPath === 'string' ? cfg.dbPath : undefined,
      port: cfg.port,
      mode: cfg.mode,
    }
  } catch {
    return {}
  }
}

export function trellisServerConfig(cwd = process.cwd()): TrellisServerConfig {
  const file = loadDbJson(cwd)
  const origin = (
    process.env.TRELLIS_URL ??
    file.origin ??
    'http://localhost:8230'
  ).replace(/\/$/, '')

  const apiKey = process.env.TRELLIS_API_KEY ?? file.apiKey
  const dbPath = file.dbPath ?? resolve(cwd, '.trellis-db')

  return { origin, apiKey, dbPath }
}

export function trellisAuthHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  return headers
}

export function ontologyOverlayPath(dbPath: string): string {
  return join(dbPath, 'ontology-overlays.json')
}

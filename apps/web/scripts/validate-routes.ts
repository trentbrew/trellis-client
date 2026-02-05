/**
 * Route Validation Script
 * Compares routes.ts config against actual page files
 *
 * Run with: npx tsx scripts/validate-routes.ts
 * Or add to package.json: "validate:routes": "tsx scripts/validate-routes.ts"
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PAGES_DIR = resolve(ROOT, 'app/pages')
const APP_CONFIG_PATH = resolve(ROOT, 'app/config/app-config.jsonld')

const ROOT_CATCH_ALL = resolve(PAGES_DIR, '[...path].vue')
const FACILITY_CATCH_ALL = resolve(PAGES_DIR, '[org]/[year]/[facility]/[...path].vue')

const IGNORED_ORPHAN_PREFIXES = [
  '/auth',
  '/archive',
  '/components',
  '/collections',
  '/community',
  '/content',
  '/embed',
  '/graph',
  '/layouts',
  '/learn',
  '/members',
  '/notifications',
  '/onboarding',
  '/playground',
  '/types',
  '/welcome',
  '/widgets',
  '/workflows',
]

const IGNORED_ORPHAN_EXACT = new Set([
  '/[...path]',
  '/facility/[...path]',
  '/activity',
  '/ads',
  '/',
  '/admin/cleanup',
  '/tasks',
  '/calendar',
  '/templates',
])

interface RouteConfig {
  path: string
  label: string
  children?: RouteConfig[]
  inRail?: boolean
  inCommandPalette?: boolean
}

type AppConfigNode = Record<string, any> & {
  '@id'?: string
  '@type'?: string | string[]
}

const parseAppConfigGraph = (): AppConfigNode[] => {
  try {
    const raw = readFileSync(APP_CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw) as { '@graph'?: AppConfigNode[] }
    return Array.isArray(parsed?.['@graph']) ? parsed['@graph']! : []
  } catch (error) {
    console.error('Failed to parse app-config.jsonld:', error)
    return []
  }
}

const normalizeTypes = (raw: AppConfigNode['@type']): string[] => {
  if (Array.isArray(raw)) return raw.filter((t) => typeof t === 'string') as string[]
  if (typeof raw === 'string') return [raw]
  return []
}

const buildRouteTreeFromConfig = (): RouteConfig[] => {
  const graph = parseAppConfigGraph()
  const nodeById = new Map<string, AppConfigNode>()
  const nodesByType = new Map<string, AppConfigNode[]>()

  graph.forEach((node) => {
    if (!node || typeof node !== 'object') return
    const id = node['@id']
    if (typeof id === 'string') nodeById.set(id, node)

    normalizeTypes(node['@type']).forEach((type) => {
      const list = nodesByType.get(type) ?? []
      list.push(node)
      nodesByType.set(type, list)
    })
  })

  const resolveRouteRef = (value: unknown): AppConfigNode | null => {
    if (!value) return null
    if (typeof value === 'string') return nodeById.get(value) ?? null
    if (typeof value === 'object') {
      const maybeId = (value as AppConfigNode)['@id']
      if (typeof maybeId === 'string' && nodeById.has(maybeId)) return nodeById.get(maybeId) ?? null
      return value as AppConfigNode
    }
    return null
  }

  const buildRouteConfigFromNode = (node: AppConfigNode): RouteConfig => {
    const childNodes = Array.isArray(node.children) ? node.children.map(resolveRouteRef).filter(Boolean) : []
    const children = childNodes.length ? childNodes.map((child) => buildRouteConfigFromNode(child!)) : undefined

    return {
      path: String(node.routePath ?? node.path ?? ''),
      label: String(node.label ?? node.title ?? ''),
      children,
      inRail: typeof node.inRail === 'boolean' ? node.inRail : undefined,
      inCommandPalette: typeof node.inCommandPalette === 'boolean' ? node.inCommandPalette : undefined,
    }
  }

  const routeNodes = nodesByType.get('app:Route') ?? []
  const childIds = new Set<string>()

  routeNodes.forEach((node) => {
    if (!Array.isArray(node.children)) return
    node.children.forEach((child) => {
      const resolved = resolveRouteRef(child)
      const id = resolved?.['@id']
      if (typeof id === 'string') childIds.add(id)
    })
  })

  return routeNodes
    .filter((node) => {
      const id = node['@id']
      if (!node.routePath && !node.path) return false
      if (node.inRail) return true
      if (typeof id === 'string' && childIds.has(id)) return false
      return true
    })
    .slice()
    .sort((a, b) => Number(a.order ?? 999) - Number(b.order ?? 999))
    .map(buildRouteConfigFromNode)
}

// Import and flatten routes
async function getConfiguredRoutes(): Promise<string[]> {
  const routeConfig = buildRouteTreeFromConfig()

  const flattened: RouteConfig[] = []
  const traverse = (route: RouteConfig) => {
    if (route.children && route.children.length > 0) {
      route.children.forEach(traverse)
    }

    if (!route.path) return

    const hasChildren = route.children && route.children.length > 0
    if (!hasChildren) {
      flattened.push(route)
      return
    }

    if (route.inRail || route.inCommandPalette !== false) {
      flattened.push(route)
    }
  }

  ;(routeConfig as RouteConfig[]).forEach(traverse)
  return flattened.map((r) => r.path).filter(Boolean)
}

// Scan file system for page files
function getPageFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files

  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      getPageFiles(fullPath, files)
    } else if (item.endsWith('.vue')) {
      files.push(fullPath)
    }
  }

  return files
}

function fileToRoutePath(file: string): string {
  let route = file
    .replace(PAGES_DIR, '')
    .replace(/\.vue$/, '')
    .replace(/\/index$/, '')
    .replace(/\\/g, '/')

  if (route === '') route = '/'

  // Facility pages live under /[org]/[year]/[facility]/... but routes.ts uses clean /facility/...
  const facilityMatch = /^\/\[org\]\/\[year\]\/\[facility\](\/.*)?$/.exec(route)
  if (facilityMatch) {
    const rest = facilityMatch[1] || ''
    route = rest ? `/facility${rest}` : '/facility'
  }

  return route
}

function routeToFilePaths(route: string): string[] {
  // Facility routes map to the prefixed page directory
  if (route === '/facility' || route.startsWith('/facility/')) {
    const sub = route.replace(/^\/facility/, '')
    const base = sub ? `/[org]/[year]/[facility]${sub}` : '/[org]/[year]/[facility]'
    const fileBase = base === '/[org]/[year]/[facility]' ? `${base}/index` : base
    const normalized = fileBase.replace(/:([^/]+)/g, '[$1]')
    return [`${PAGES_DIR}${normalized}.vue`, `${PAGES_DIR}${normalized}/index.vue`]
  }

  const base = route === '/' ? '/index' : route
  const normalized = base.replace(/:([^/]+)/g, '[$1]')
  return [`${PAGES_DIR}${normalized}.vue`, `${PAGES_DIR}${normalized}/index.vue`]
}

async function validate() {
  console.log('\n📋 Route Validation Report')
  console.log('━'.repeat(50))

  // Get configured routes
  const configuredRoutes = await getConfiguredRoutes()
  console.log(`\n${colors.blue}Config:${colors.reset} ${configuredRoutes.length} routes in routes.ts`)

  // Get page files
  const pageFiles = getPageFiles(PAGES_DIR)
  const pageRoutes = pageFiles.map(fileToRoutePath)
  console.log(`${colors.blue}Files:${colors.reset}  ${pageRoutes.length} page files in app/pages/\n`)

  // Find routes without page files
  const missingPages: string[] = []
  for (const route of configuredRoutes) {
    const possibleFiles = routeToFilePaths(route)
    const exists = possibleFiles.some((f) => existsSync(f))
    if (exists) continue

    // In the prototype, many routes intentionally fall through to catch-all placeholder pages.
    // Treat those catch-alls as valid route implementations.
    const isFacilityRoute = route === '/facility' || route.startsWith('/facility/')
    if (isFacilityRoute && existsSync(FACILITY_CATCH_ALL)) continue
    if (!isFacilityRoute && existsSync(ROOT_CATCH_ALL)) continue

    missingPages.push(route)
  }

  // Find orphan pages (files without routes)
  const orphanPages: string[] = []
  for (const pageRoute of pageRoutes) {
    if (!configuredRoutes.includes(pageRoute)) {
      orphanPages.push(pageRoute)
    }
  }

  const filteredOrphanPages = orphanPages
    .filter((route) => !IGNORED_ORPHAN_EXACT.has(route))
    .filter((route) => !IGNORED_ORPHAN_PREFIXES.some((prefix) => route.startsWith(prefix)))

  // Report missing pages
  if (missingPages.length > 0) {
    console.log(`${colors.red}⚠️  Routes without page files:${colors.reset}`)
    missingPages.forEach((route) => {
      console.log(`   ${colors.red}✗${colors.reset} ${route}`)
    })
    console.log('')
  }

  // Report orphan pages
  if (filteredOrphanPages.length > 0) {
    console.log(`${colors.yellow}📄 Page files without routes in config:${colors.reset}`)
    filteredOrphanPages.forEach((route) => {
      console.log(`   ${colors.yellow}?${colors.reset} ${route}`)
    })
    console.log(`${colors.dim}   (These pages work but aren't in navigation/command palette)${colors.reset}\n`)
  }

  // Summary
  console.log('━'.repeat(50))
  if (missingPages.length === 0 && filteredOrphanPages.length === 0) {
    console.log(`${colors.green}✓ All routes are valid!${colors.reset}\n`)
    process.exit(0)
  } else {
    const issues = missingPages.length + filteredOrphanPages.length
    console.log(`${colors.yellow}Found ${issues} issue(s) to review${colors.reset}\n`)
    process.exit(missingPages.length > 0 ? 1 : 0) // Only fail on missing pages
  }
}

validate().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Sidebar affordance registry — how dynamic workspace sections resolve.
 *
 * Agents adding a new projection or route-owned sidebar should read:
 * `docs/getting-started/AFFORDANCE_SIDEBAR_GUIDE.md`
 */

import type { RouteConfig } from '~/config/routes'

/** Keywords stored on `sidebar_node.specialItems` (graph) or legacy route section keys. */
export const SIDEBAR_SPECIAL_ITEMS = {
  /** `usePinnedItems()` — workspace PINNED section */
  pinned: 'pinned',
  /** `usePageNotes()` — user pages under PAGES */
  pages: 'pages',
  /** Sheets + decks browse links and live entity children — WORKSHOP section */
  workshop: 'workshop',
  /** @deprecated Use `workshop` — kept for graph nodes seeded before decks shipped */
  sheets: 'sheets',
} as const

export type SidebarSpecialItemsKeyword = (typeof SIDEBAR_SPECIAL_ITEMS)[keyof typeof SIDEBAR_SPECIAL_ITEMS]

export function isWorkshopSpecialItems(keyword: string | undefined): boolean {
  return keyword === SIDEBAR_SPECIAL_ITEMS.workshop || keyword === SIDEBAR_SPECIAL_ITEMS.sheets
}

export const WORKSHOP_BROWSE_LINKS: RouteConfig[] = [
  {
    path: '/sheets',
    label: 'All sheets',
    icon: 'lucide:table-2',
    tint: 'text-emerald-400',
  },
  {
    path: '/decks',
    label: 'All decks',
    icon: 'lucide:presentation',
    tint: 'text-violet-400',
  },
  {
    path: '/canvases',
    label: 'All canvases',
    icon: 'lucide:layout-dashboard',
    tint: 'text-cyan-400',
  },
]

export function resolveWorkshopSidebarItems(
  sheetsChildren: RouteConfig[],
  decksChildren: RouteConfig[],
  staticBrowseLinks: RouteConfig[] = WORKSHOP_BROWSE_LINKS,
): RouteConfig[] {
  return [...staticBrowseLinks, ...sheetsChildren, ...decksChildren]
}

/**
 * Route-owned sidebar panels — dedicated component replaces generic sections when active.
 * Register new affordances in AppSidebar.vue (`is*Route` + template branch).
 */
export const ROUTE_SIDEBAR_PANELS = [
  { pathPrefix: '/calendar', component: 'CalendarSidebarPanel' },
  { pathPrefix: '/locations', component: 'LocationsSidebarPanel' },
  { pathPrefix: '/home', component: 'AgentConversationList' },
  { pathPrefix: '/messages', component: 'ChatSidebar' },
  { pathPrefix: '/pages', component: 'PagesSidebar' },
  { pathPrefix: '/canvases', component: 'CanvasesSidebar' },
] as const

import { getRouteMeta } from '~/config/routes'

/**
 * Global middleware that applies SEO metadata from route config
 * Runs on every route navigation (both SSR and client)
 */
export default defineNuxtRouteMiddleware((to) => {
  const meta = getRouteMeta(to.path)

  if (meta?.title) {
    useHead({
      title: meta.title,
    })
  }
})

import { getRouteMeta } from '~/config/routes'

/**
 * Composable that automatically applies SEO metadata from route config
 * Call this in any page to set the tab title and SEO meta from the centralized route config
 */
export const usePageMeta = () => {
  const route = useRoute()

  // Get meta from route config
  const routeMeta = computed(() => getRouteMeta(route.path))

  // Apply SEO meta reactively
  watchEffect(() => {
    const meta = routeMeta.value
    if (meta?.title || meta?.description) {
      useSeoMeta({
        title: meta.title,
        description: meta.description,
        ogTitle: meta.title,
        ogDescription: meta.description,
        twitterTitle: meta.title,
        twitterDescription: meta.description,
        twitterCard: 'summary_large_image',
      })
    }
  })

  return {
    meta: routeMeta,
  }
}

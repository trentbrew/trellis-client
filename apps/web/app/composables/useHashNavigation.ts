import type { Ref } from 'vue'

interface PageTab {
  label: string
  to: string
  icon?: string
}

export function useHashNavigation(tabs: Ref<PageTab[] | undefined>) {
  const route = useRoute()
  const router = useRouter()

  const activeHash = ref('')
  const isScrolling = ref(false)
  const highlightedSection = ref('')

  const hashTabs = computed(() => tabs.value?.filter((tab) => tab.to?.startsWith('#')) || [])

  const isTabActive = (to: string): boolean => {
    if (to.startsWith('#')) {
      if (!activeHash.value && hashTabs.value[0]?.to === to) return true
      return activeHash.value === to
    }
    return route.path === to
  }

  const handleHashClick = (hash: string) => {
    if (import.meta.client) {
      const el = document.querySelector(hash)
      if (el) {
        isScrolling.value = true
        activeHash.value = hash
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`)

        el.scrollIntoView({ behavior: 'smooth', block: 'start' })

        highlightedSection.value = hash
        setTimeout(() => {
          highlightedSection.value = ''
        }, 800)

        setTimeout(() => {
          isScrolling.value = false
        }, 600)
      }
    }
  }

  const isSectionHighlighted = (id: string): boolean => {
    return highlightedSection.value === `#${id}`
  }

  const setupScrollObserver = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.value) return

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const hash = `#${entry.target.id}`
            if (hashTabs.value.some((tab) => tab.to === hash)) {
              activeHash.value = hash
              window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
            }
          }
        }
      },
      { threshold: [0.3, 0.5, 0.7], rootMargin: '-100px 0px -50% 0px' },
    )

    nextTick(() => {
      hashTabs.value.forEach((tab) => {
        const el = document.querySelector(tab.to)
        if (el) observer.observe(el)
      })
    })
  }

  onMounted(() => {
    if (import.meta.client) {
      activeHash.value = window.location.hash || hashTabs.value[0]?.to || ''

      if (!route.hash && hashTabs.value[0]?.to && !window.location.hash) {
        router.replace({ path: route.path, query: route.query, hash: hashTabs.value[0].to })
      }

      window.addEventListener('hashchange', () => {
        if (!isScrolling.value) {
          activeHash.value = window.location.hash
        }
      })

      setupScrollObserver()
    }
  })

  return {
    activeHash,
    isTabActive,
    handleHashClick,
    isSectionHighlighted,
  }
}

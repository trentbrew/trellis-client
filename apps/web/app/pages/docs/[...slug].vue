<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()

  const docPath = computed(() => route.path)

  const { data: doc } = await useAsyncData(
    `doc-${docPath.value}`,
    () => queryCollection('docs').path(docPath.value).first(),
    { watch: [docPath] },
  )

  // Table of contents from document headings
  const tableOfContents = ref<{ id: string; text: string; level: number }[]>([])

  function extractToc() {
    nextTick(() => {
      const article = document.querySelector('article.prose')
      if (article) {
        const headings = article.querySelectorAll('h2, h3')
        tableOfContents.value = Array.from(headings).map((heading) => ({
          id: heading.id || '',
          text: heading.textContent || '',
          level: parseInt(heading.tagName.substring(1), 10),
        }))
      }
    })
  }

  onMounted(extractToc)
  watch(doc, extractToc)

  useHead({
    title: doc.value?.title || 'Documentation',
  })
</script>

<template>
  <div class="flex min-h-full">
    <!-- Main Content -->
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="px-6 py-8 max-w-4xl mx-auto">
        <article v-if="doc" class="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20">
          <ContentRenderer :value="doc" />
        </article>

        <div v-else class="text-center py-12">
          <Icon name="lucide:file-question" class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 class="text-lg font-semibold">Document not found</h2>
          <p class="text-muted-foreground mt-2">The requested documentation page could not be found.</p>
          <NuxtLink to="/docs" class="inline-flex items-center gap-2 mt-4 text-primary hover:underline">
            <Icon name="lucide:arrow-left" class="h-4 w-4" />
            Back to Documentation
          </NuxtLink>
        </div>
      </div>
    </main>

    <!-- Page Outline (Table of Contents) -->
    <aside v-if="tableOfContents.length > 0" class="w-56 shrink-0 border-l border-border hidden xl:block">
      <div class="sticky top-0 p-4">
        <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">On this page</h4>
        <nav class="space-y-1">
          <a
            v-for="item in tableOfContents"
            :key="item.id"
            :href="`#${item.id}`"
            class="block text-sm py-1 transition-colors text-muted-foreground hover:text-foreground"
            :class="{ 'pl-3': item.level === 3 }">
            {{ item.text }}
          </a>
        </nav>
      </div>
    </aside>
  </div>
</template>

<style>
  @reference "~/assets/css/tailwind.css";

  .prose pre {
    @apply bg-muted rounded-lg;
  }

  .prose code {
    @apply bg-muted px-1.5 py-0.5 rounded text-sm;
  }

  .prose pre code {
    @apply bg-transparent p-0;
  }
</style>

<script setup lang="ts">
definePageMeta({
  title: 'Activity',
  icon: 'lucide:activity',
  middleware: ['auth'],
})

type ActivityTab = 'status' | 'alerts'

const activeTab = ref<ActivityTab>('status')

function selectTab(tab: ActivityTab) {
  activeTab.value = tab
}
</script>

<template>
  <div class="mx-auto w-full max-w-[720px] px-4 py-6 md:px-6" data-campus-zone="lobby">
    <div class="h-[3px] w-full rounded-full bg-linear-to-r from-amber-500/80 to-transparent" aria-hidden="true" />

    <header class="border-b border-border/50 pb-4 pt-6">
      <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-500">Lobby · Activity</p>
      <h1 class="mt-2 text-lg font-semibold tracking-tight">Activity</h1>
      <p class="mt-1 text-xs text-muted-foreground">Status and sync — review when ready.</p>

      <div class="mt-4 flex gap-1" role="tablist" aria-label="Activity feed tabs">
        <button
          type="button"
          role="tab"
          class="rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors"
          :class="
            activeTab === 'status'
              ? 'border border-border bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          :aria-selected="activeTab === 'status'"
          @click="selectTab('status')">
          Status
        </button>
        <button
          type="button"
          role="tab"
          class="rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors"
          :class="
            activeTab === 'alerts'
              ? 'border border-border bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          :aria-selected="activeTab === 'alerts'"
          @click="selectTab('alerts')">
          Alerts history
        </button>
      </div>
    </header>

    <div class="overflow-hidden rounded-lg border border-border/50 bg-card/40">
      <ActivityFeed :tab="activeTab" />
    </div>

    <footer class="mt-4 text-[11px] text-muted-foreground">
      Mutation log (TQL ops) lives at
      <NuxtLink to="/ontologies/activity" class="font-semibold text-primary hover:underline">
        Ontologies → Activity log
      </NuxtLink>
      — separate from notification status.
    </footer>
  </div>
</template>

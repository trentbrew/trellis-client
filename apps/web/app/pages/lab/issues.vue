<script setup lang="ts">
  definePageMeta({
    title: 'Lab Issues',
    icon: 'lucide:square-kanban',
  })

  const {
    columns,
    workspaceRoot,
    workspaceName,
    loading,
    refreshing,
    error,
    syncLabel,
    selectedId,
    detail,
    detailLoading,
    refresh,
    openDetail,
    closeDetail,
  } = useVcsIssues()

  const drawerOpen = computed({
    get: () => Boolean(selectedId.value),
    set: (value: boolean) => {
      if (!value) closeDetail()
    },
  })

  function onSelect(issue: import('~/types/vcs-issue').VcsIssueSummary, el: HTMLElement) {
    void openDetail(issue.id, el)
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true" :hide-sidebar="true">
    <div class="flex h-full min-h-0 flex-col">
      <header class="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <div class="flex items-center gap-2 text-base font-semibold">
            <Icon name="lucide:flask-conical" class="h-[18px] w-[18px] text-primary" />
            Lab
          </div>
          <LabSubNav active="issues" class="mt-3" />
        </div>
        <span
          v-if="workspaceName"
          class="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
          :title="workspaceRoot">
          {{ workspaceName }}
        </span>
      </header>

      <VcsIssueFilterBar :refreshing="refreshing" :sync-label="syncLabel" @refresh="refresh()" />

      <div v-if="error?.code === 'NO_VCS_REPO'" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:folder-x" class="h-10 w-10 text-muted-foreground/50" />
        <div class="text-sm font-medium">No TrellisVCS repo in this workspace</div>
        <p class="max-w-md text-sm text-muted-foreground">Run <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">trellis init</code> in your project root, then refresh.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Retry</UiButton>
      </div>

      <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:triangle-alert" class="h-10 w-10 text-destructive/70" />
        <div class="text-sm font-medium">Could not load issues</div>
        <p class="max-w-md text-sm text-muted-foreground">{{ error.message }}</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Retry</UiButton>
      </div>

      <div v-else-if="!loading && columns.every((c) => c.issues.length === 0)" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:inbox" class="h-10 w-10 text-muted-foreground/50" />
        <div class="text-sm font-medium">No issues yet</div>
        <p class="text-sm text-muted-foreground">Create one with <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">trellis issue create</code></p>
      </div>

      <div v-else class="min-h-0 flex-1 overflow-auto pt-4">
        <VcsIssueBoard :loading="loading" :columns="columns" @select="onSelect" />
      </div>

      <VcsIssueDetailDrawer
        v-model:open="drawerOpen"
        :loading="detailLoading"
        :detail="detail" />
    </div>
  </Page>
</template>

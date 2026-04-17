<script setup lang="ts">
  /**
   * Mail — hybrid Gmail client.
   *
   * - Live fetch from Gmail API via server proxy (thread list + full messages)
   * - Persist thread metadata to TQL `email` entities on open (for linking)
   * - Entity link picker creates `references` relations in the graph
   *
   * Layout:
   *   ┌───────────────┬────────────────────────┬─────────────────────────┐
   *   │ Label Nav     │ Thread List            │ Message Viewer          │
   *   └───────────────┴────────────────────────┴─────────────────────────┘
   */
  import { useGmail, type GmailThreadSummary, type GmailThreadFull, type GmailLabel } from '~/composables/useGmail'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()

  const { isConnected, connect, fetchThreads, fetchThread, sendMessage, listLabels, persistThreadToTql } = useGmail()
  const { items: allItems } = useEntities()
  const detailSheet = useGlobalDetailSheet()

  // ── URL-driven state ────────────────────────────────────────────────
  // Label is driven by ?label=INBOX query so the sidebar links work.

  const activeLabel = computed<string>(() => {
    const q = route.query.label
    return typeof q === 'string' && q ? q : 'INBOX'
  })

  const searchQuery = ref('')

  // ── Thread list ─────────────────────────────────────────────────────

  const threads = ref<GmailThreadSummary[]>([])
  const threadsLoading = ref(false)
  const threadsError = ref<string | null>(null)
  const nextPageToken = ref<string | undefined>(undefined)
  const loadingMore = ref(false)
  const PAGE_SIZE = 100

  const hasMore = computed(() => !!nextPageToken.value)

  async function loadThreads() {
    if (!isConnected.value) return
    threadsLoading.value = true
    threadsError.value = null
    nextPageToken.value = undefined
    try {
      const { threads: data, nextPageToken: token } = await fetchThreads({
        labelId: activeLabel.value,
        q: searchQuery.value || undefined,
        maxResults: PAGE_SIZE,
      })
      threads.value = data
      nextPageToken.value = token
    } catch (err: any) {
      threadsError.value = err?.message || 'Failed to load mail'
      threads.value = []
    } finally {
      threadsLoading.value = false
    }
  }

  async function loadMore() {
    if (!isConnected.value || !nextPageToken.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const { threads: more, nextPageToken: token } = await fetchThreads({
        labelId: activeLabel.value,
        q: searchQuery.value || undefined,
        maxResults: PAGE_SIZE,
        pageToken: nextPageToken.value,
      })
      // Dedupe by id in case Gmail returns overlap at page boundary
      const existing = new Set(threads.value.map((t) => t.id))
      threads.value = [...threads.value, ...more.filter((t) => !existing.has(t.id))]
      nextPageToken.value = token
    } catch (err: any) {
      threadsError.value = err?.message || 'Failed to load more mail'
    } finally {
      loadingMore.value = false
    }
  }

  watch([isConnected, activeLabel], loadThreads, { immediate: true })

  let searchTimer: ReturnType<typeof setTimeout> | null = null
  watch(searchQuery, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(loadThreads, 300)
  })

  // ── Selected thread ─────────────────────────────────────────────────

  const selectedThreadId = ref<string | null>(null)
  const selectedThread = ref<GmailThreadFull | null>(null)
  const threadLoading = ref(false)

  async function openThread(threadId: string) {
    selectedThreadId.value = threadId
    threadLoading.value = true
    try {
      const data = await fetchThread(threadId)
      selectedThread.value = data

      // Persist to TQL as email entity, then open in EntityDialog
      const entityId = await persistThreadToTql(data)
      // persistThreadToTql returns namespaced id (entity:gmail-xxx), items store stripped ids (gmail-xxx)
      const strippedId = entityId.replace(/^entity:/, '')
      const findEntity = () => allItems.value.find((e: any) => e.id === strippedId || e.id === entityId)

      // Entity may not be in the reactive list yet — poll up to ~2s for TQL watcher to fire
      let entity = findEntity()
      if (!entity) {
        for (let i = 0; i < 20 && !entity; i++) {
          await new Promise((r) => setTimeout(r, 100))
          entity = findEntity()
        }
      }
      if (entity) {
        detailSheet.open(entity, { mode: 'view' })
      } else {
        console.warn('[mail] Entity not found after persist:', entityId)
      }
    } catch (err) {
      console.error('[mail] Failed to open thread:', err)
      selectedThread.value = null
    } finally {
      threadLoading.value = false
    }
  }

  // ── Reply composer ──────────────────────────────────────────────────

  const replyOpen = ref(false)
  const replyBody = ref('')
  const replySending = ref(false)

  async function handleReply() {
    if (!selectedThread.value || !replyBody.value.trim()) return
    const lastMsg = selectedThread.value.messages[selectedThread.value.messages.length - 1]
    if (!lastMsg) return

    replySending.value = true
    try {
      await sendMessage({
        to: lastMsg.from,
        subject: lastMsg.subject.startsWith('Re: ') ? lastMsg.subject : `Re: ${lastMsg.subject}`,
        body: replyBody.value,
        threadId: selectedThread.value.id,
        inReplyTo: lastMsg.messageId,
        references: lastMsg.messageId,
      })
      replyBody.value = ''
      replyOpen.value = false
      // Refresh thread
      await openThread(selectedThread.value.id)
    } catch (err: any) {
      console.error('[mail] Reply failed:', err)
    } finally {
      replySending.value = false
    }
  }

  // ── Compose new message ─────────────────────────────────────────────

  const composeOpen = ref(false)
  const composeForm = reactive({ to: '', subject: '', body: '' })
  const composeSending = ref(false)

  async function handleSend() {
    if (!composeForm.to || !composeForm.subject) return
    composeSending.value = true
    try {
      await sendMessage({
        to: composeForm.to,
        subject: composeForm.subject,
        body: composeForm.body,
      })
      composeForm.to = ''
      composeForm.subject = ''
      composeForm.body = ''
      composeOpen.value = false
    } catch (err: any) {
      console.error('[mail] Send failed:', err)
    } finally {
      composeSending.value = false
    }
  }

  // ── Labels (for the sidebar LABELS section) ────────────────────────

  const userLabels = ref<GmailLabel[]>([])

  async function loadUserLabels() {
    if (!isConnected.value) return
    try {
      const all = await listLabels()
      // Gmail has system labels (INBOX, SENT, etc.) — keep only user-created ones
      userLabels.value = all.filter((l: GmailLabel) => l.type === 'user')
    } catch (err) {
      console.error('[mail] Failed to load labels:', err)
    }
  }

  watch(isConnected, loadUserLabels, { immediate: true })

  // ── Helpers ─────────────────────────────────────────────────────────

  function formatSender(from: string): string {
    // "Name <email>" → Name; "email@x.com" → email@x.com
    const match = /^(.+?)\s*<(.+)>$/.exec(from)
    return match?.[1]?.replace(/["']/g, '').trim() || from
  }

  function formatDateShort(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function sanitizedBody(html: string | undefined): string {
    // Very lightweight — real sanitization should happen server-side
    if (!html) return ''
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
  }

  function _selectLabel(label: string) {
    router.push({ path: '/mail', query: { label } })
  }
  void _selectLabel // exposed for future sidebar-driven navigation
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Not connected: full-width CTA -->
    <div v-if="!isConnected" class="flex-1 flex items-center justify-center">
      <div class="max-w-md text-center space-y-6 p-8">
        <div class="inline-flex p-4 rounded-full bg-primary/10">
          <Icon name="lucide:mail" class="w-10 h-10 text-primary" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold">Connect Gmail</h2>
          <p class="text-sm text-muted-foreground">
            Read, send, and link emails to tasks, people, and projects. Your messages become part of the graph.
          </p>
        </div>
        <UiButton size="lg" @click="connect()">
          <Icon name="simple-icons:gmail" class="w-4 h-4 mr-2" />
          Connect Gmail
        </UiButton>
        <p class="text-xs text-muted-foreground">
          Requires
          <code class="text-[10px] bg-muted px-1 py-0.5 rounded">gmail.readonly</code>
          ,
          <code class="text-[10px] bg-muted px-1 py-0.5 rounded">gmail.send</code>
          , and
          <code class="text-[10px] bg-muted px-1 py-0.5 rounded">gmail.modify</code>
        </p>
      </div>
    </div>

    <!-- Connected: 2-pane layout (sidebar nav is provided by AppSidebar) -->
    <template v-else>
      <!-- Thread list -->
      <div class="w-[360px] shrink-0 border-r border-border/60 flex flex-col bg-card/30">
        <!-- Toolbar -->
        <div class="p-3 border-b border-border/60 flex items-center gap-2">
          <div class="relative flex-1">
            <Icon
              name="lucide:search"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search mail"
              class="w-full h-9 pl-8 pr-3 text-sm bg-muted/50 border-0 rounded-md placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <UiButton size="icon-sm" variant="ghost" title="Refresh" @click="loadThreads">
            <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="{ 'animate-spin': threadsLoading }" />
          </UiButton>
          <UiButton size="icon-sm" title="Compose" @click="composeOpen = true">
            <Icon name="lucide:pen-square" class="w-4 h-4" />
          </UiButton>
        </div>

        <!-- Label header -->
        <div class="px-3 py-2 border-b border-border/60 flex items-center justify-between bg-muted/10">
          <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {{ activeLabel }}
          </span>
          <span v-if="threads.length" class="text-xs text-muted-foreground">{{ threads.length }}</span>
        </div>

        <!-- Thread list body -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="threadsLoading && threads.length === 0" class="p-4 space-y-2">
            <div v-for="i in 8" :key="i" class="h-16 rounded-md bg-muted/30 animate-pulse" />
          </div>

          <div v-else-if="threadsError" class="p-6 text-center space-y-3">
            <Icon name="lucide:alert-circle" class="w-8 h-8 text-destructive mx-auto" />
            <p class="text-sm text-destructive">{{ threadsError }}</p>
            <UiButton size="sm" variant="outline" @click="loadThreads">Retry</UiButton>
          </div>

          <div v-else-if="threads.length === 0" class="p-6 text-center">
            <Icon name="lucide:mail-open" class="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p class="text-sm text-muted-foreground">No mail in {{ activeLabel }}</p>
          </div>

          <ul v-else class="divide-y divide-border/40">
            <li
              v-for="thread in threads"
              :key="thread.id"
              class="group px-3 py-2.5 cursor-pointer transition-colors"
              :class="selectedThreadId === thread.id ? 'bg-primary/10' : 'hover:bg-muted/40'"
              @click="openThread(thread.id)">
              <div class="flex items-start gap-2">
                <div
                  class="w-2 h-2 mt-2 rounded-full shrink-0"
                  :class="thread.unread ? 'bg-primary' : 'bg-transparent'" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      class="text-sm truncate"
                      :class="thread.unread ? 'font-semibold' : 'font-medium text-muted-foreground'">
                      {{ formatSender(thread.from) }}
                    </span>
                    <span class="text-[11px] text-muted-foreground shrink-0">{{ formatDateShort(thread.date) }}</span>
                  </div>
                  <div
                    class="text-sm truncate mb-0.5"
                    :class="thread.unread ? 'text-foreground' : 'text-muted-foreground'">
                    {{ thread.subject || '(no subject)' }}
                  </div>
                  <div class="text-xs text-muted-foreground truncate">{{ thread.snippet }}</div>
                </div>
              </div>
            </li>
          </ul>

          <!-- Load more -->
          <div v-if="threads.length > 0 && hasMore" class="p-3 border-t border-border/40">
            <UiButton size="sm" variant="outline" class="w-full" :disabled="loadingMore" @click="loadMore">
              <Icon
                :name="loadingMore ? 'lucide:loader-2' : 'lucide:chevron-down'"
                class="w-4 h-4 mr-1.5"
                :class="{ 'animate-spin': loadingMore }" />
              {{ loadingMore ? 'Loading…' : 'Load more' }}
            </UiButton>
          </div>

          <div v-else-if="threads.length > 0 && !hasMore" class="p-3 text-center text-[11px] text-muted-foreground/60">
            No more threads
          </div>
        </div>
      </div>

      <!-- Message viewer -->
      <div class="flex-1 flex flex-col overflow-hidden bg-background">
        <div v-if="!selectedThread && !threadLoading" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <Icon name="lucide:mail-open" class="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p class="text-sm text-muted-foreground">Select a thread to read</p>
          </div>
        </div>

        <div v-else-if="threadLoading" class="p-8 space-y-4">
          <div class="h-6 w-3/4 rounded bg-muted/40 animate-pulse" />
          <div class="h-4 w-1/3 rounded bg-muted/40 animate-pulse" />
          <div class="h-32 rounded bg-muted/30 animate-pulse" />
        </div>

        <template v-else-if="selectedThread">
          <!-- Thread header -->
          <div class="px-6 py-4 border-b border-border/60 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="text-lg font-semibold mb-1 truncate">
                {{ selectedThread.messages[0]?.subject || '(no subject)' }}
              </h2>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{{ selectedThread.messages.length }} message(s)</span>
                <span>·</span>
                <span v-for="(lid, i) in selectedThread.labelIds" :key="lid" class="inline-flex items-center">
                  <span class="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">{{ lid }}</span>
                  <span v-if="i < selectedThread.labelIds.length - 1" class="mx-1">·</span>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UiButton size="sm" variant="ghost" title="Link to entity" disabled>
                <Icon name="lucide:paperclip" class="w-4 h-4 mr-1.5" />
                Link
              </UiButton>
              <UiButton size="sm" variant="ghost" title="Archive" disabled>
                <Icon name="lucide:archive" class="w-4 h-4" />
              </UiButton>
            </div>
          </div>

          <!-- Message list -->
          <div class="flex-1 overflow-y-auto">
            <article
              v-for="msg in selectedThread.messages"
              :key="msg.id"
              class="px-6 py-5 border-b border-border/40 last:border-b-0">
              <header class="flex items-start justify-between gap-4 mb-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span class="text-xs font-semibold text-primary">
                        {{ formatSender(msg.from).charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-medium truncate">{{ formatSender(msg.from) }}</div>
                      <div class="text-xs text-muted-foreground truncate">to {{ msg.to }}</div>
                    </div>
                  </div>
                </div>
                <time class="text-xs text-muted-foreground shrink-0">{{ formatDateShort(msg.date) }}</time>
              </header>
              <div
                class="prose prose-sm dark:prose-invert max-w-none text-sm"
                v-html="sanitizedBody(msg.bodyHtml) || msg.bodyText || msg.snippet" />
            </article>
          </div>

          <!-- Reply bar -->
          <div class="border-t border-border/60 bg-card/40">
            <div v-if="!replyOpen" class="px-6 py-3 flex items-center gap-2">
              <UiButton size="sm" variant="outline" @click="replyOpen = true">
                <Icon name="lucide:reply" class="w-4 h-4 mr-1.5" />
                Reply
              </UiButton>
              <UiButton size="sm" variant="outline" disabled>
                <Icon name="lucide:forward" class="w-4 h-4 mr-1.5" />
                Forward
              </UiButton>
            </div>

            <div v-else class="p-4 space-y-3">
              <textarea
                v-model="replyBody"
                rows="5"
                placeholder="Write a reply…"
                class="w-full text-sm bg-muted/40 border border-border/60 rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              <div class="flex items-center justify-end gap-2">
                <UiButton size="sm" variant="ghost" :disabled="replySending" @click="replyOpen = false">
                  Cancel
                </UiButton>
                <UiButton size="sm" :disabled="!replyBody.trim() || replySending" @click="handleReply">
                  <Icon
                    :name="replySending ? 'lucide:loader-2' : 'lucide:send'"
                    class="w-4 h-4 mr-1.5"
                    :class="{ 'animate-spin': replySending }" />
                  {{ replySending ? 'Sending…' : 'Send' }}
                </UiButton>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Compose dialog -->
    <UiDialog v-model:open="composeOpen">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>New message</UiDialogTitle>
        </UiDialogHeader>
        <div class="space-y-3">
          <div class="grid grid-cols-[64px_1fr] items-center gap-2">
            <label class="text-xs font-medium text-muted-foreground">To</label>
            <input
              v-model="composeForm.to"
              type="email"
              placeholder="recipient@example.com"
              class="h-9 px-3 text-sm bg-muted/40 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div class="grid grid-cols-[64px_1fr] items-center gap-2">
            <label class="text-xs font-medium text-muted-foreground">Subject</label>
            <input
              v-model="composeForm.subject"
              type="text"
              placeholder="Subject line"
              class="h-9 px-3 text-sm bg-muted/40 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <textarea
            v-model="composeForm.body"
            rows="10"
            placeholder="Write your message…"
            class="w-full text-sm bg-muted/40 border-0 rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
        </div>
        <UiDialogFooter>
          <UiButton variant="ghost" :disabled="composeSending" @click="composeOpen = false">Cancel</UiButton>
          <UiButton :disabled="!composeForm.to || !composeForm.subject || composeSending" @click="handleSend">
            <Icon
              :name="composeSending ? 'lucide:loader-2' : 'lucide:send'"
              class="w-4 h-4 mr-1.5"
              :class="{ 'animate-spin': composeSending }" />
            {{ composeSending ? 'Sending…' : 'Send' }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

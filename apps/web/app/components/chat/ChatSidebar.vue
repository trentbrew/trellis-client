<script setup lang="ts">
  import type { Channel } from '~/types/database'

  const emit = defineEmits<{
    select: [channel: Channel]
  }>()

  const { user } = useInstantAuth()
  const {
    ungroupedPublicChannels,
    channelsByFolder,
    channelFolders,
    publicChannels,
    dms,
    threads,
    unreadCounts,
    createChannel,
    updateChannel,
    deleteChannel,
    loading,
  } = useChannels()
  const { canEditContent } = useAdminUI()
  const { $toast } = useNuxtApp()

  const route = useRoute()
  const { wp } = useWorkspacePath()
  const activeChannelId = computed(() => route.params.channelId as string | undefined)
  function isActive(id: string) { return activeChannelId.value === id }

  // ── Create ────────────────────────────────────────────────────────
  const showCreate = ref(false)
  const newChannelName = ref('')
  const creating = ref(false)

  async function handleCreate() {
    const name = newChannelName.value.trim()
    if (!name || creating.value) return
    creating.value = true
    try {
      const id = await createChannel({ title: name, type: 'public' })
      newChannelName.value = ''
      showCreate.value = false
      navigateTo(wp(`/messages/${id}`))
    } catch {
      ;($toast as any)?.error('Failed to create channel')
    } finally {
      creating.value = false
    }
  }

  // ── Rename ────────────────────────────────────────────────────────
  const renamingId = ref<string | null>(null)
  const renameValue = ref('')

  function startRename(ch: Channel) {
    renamingId.value = ch.id
    renameValue.value = ch.title
    nextTick(() => {
      const el = document.getElementById(`rename-${ch.id}`) as HTMLInputElement | null
      el?.focus()
      el?.select()
    })
  }

  async function commitRename() {
    const id = renamingId.value
    const title = renameValue.value.trim()
    renamingId.value = null
    if (!id || !title) return
    try { await updateChannel(id, { title }) }
    catch { ;($toast as any)?.error('Failed to rename channel') }
  }

  // ── Folders ───────────────────────────────────────────────────────
  const collapsedFolders = ref(new Set<string>())
  function toggleFolder(name: string) {
    if (collapsedFolders.value.has(name)) {
      collapsedFolders.value.delete(name)
    } else {
      collapsedFolders.value.add(name)
    }
  }
  const isFolderOpen = (name: string) => !collapsedFolders.value.has(name)

  const newFolderFor = ref<Channel | null>(null)
  const newFolderName = ref('')
  const creatingFolder = ref(false)

  function promptNewFolder(ch: Channel) {
    newFolderFor.value = ch
    newFolderName.value = ''
    nextTick(() => document.getElementById('new-folder-input')?.focus())
  }

  async function commitNewFolder() {
    const ch = newFolderFor.value
    const name = newFolderName.value.trim()
    if (!ch || !name || creatingFolder.value) return
    creatingFolder.value = true
    try { await updateChannel(ch.id, { folder: name }) }
    catch { ;($toast as any)?.error('Failed to create folder') }
    finally { creatingFolder.value = false; newFolderFor.value = null; newFolderName.value = '' }
  }

  async function moveToFolder(ch: Channel, folder: string | null) {
    try { await updateChannel(ch.id, { folder: folder ?? undefined }) }
    catch { ;($toast as any)?.error('Failed to move channel') }
  }

  // ── Delete ────────────────────────────────────────────────────────
  const deleteTarget = ref<Channel | null>(null)
  const deleting = ref(false)

  async function confirmDelete() {
    const ch = deleteTarget.value
    if (!ch || deleting.value) return
    deleting.value = true
    try {
      await deleteChannel(ch.id)
      if (isActive(ch.id)) navigateTo(wp('/messages'))
    } catch {
      ;($toast as any)?.error('Failed to delete channel')
    } finally {
      deleting.value = false
      deleteTarget.value = null
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function channelIcon(ch: Channel) {
    if (ch.type === 'private') return 'lucide:lock'
    if (ch.type === 'dm') return 'lucide:message-circle'
    if (ch.type === 'thread') return 'lucide:git-branch'
    return 'lucide:hash'
  }

  function dmLabel(ch: Channel) {
    if (!user.value?.id || !ch.memberIds) return ch.title
    return ch.title
  }
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Delete confirmation dialog -->
    <UiAlertDialog :open="!!deleteTarget" @update:open="(v) => { if (!v) deleteTarget = null }">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete #{{ deleteTarget?.slug ?? deleteTarget?.title }}?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            This will permanently delete the channel and all its messages. This cannot be undone.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="deleteTarget = null">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- CHANNELS section -->
    <div class="shrink-0">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</span>
        <UiTooltip v-if="canEditContent">
          <UiTooltipTrigger as-child>
            <button
              class="h-5 w-5 flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
              @click="showCreate = !showCreate"
            >
              <Icon name="lucide:plus" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">New channel</UiTooltipContent>
        </UiTooltip>
      </div>

      <!-- Create channel inline input -->
      <Transition name="slide-down">
        <div v-if="showCreate && canEditContent" class="px-3 pb-2">
          <div class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
            <Icon name="lucide:hash" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="newChannelName"
              placeholder="channel-name"
              autofocus
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              @keydown.enter="handleCreate"
              @keydown.escape="showCreate = false"
            />
            <button
              :disabled="!newChannelName.trim() || creating"
              class="text-xs text-primary disabled:opacity-40 hover:text-primary/80 transition-colors font-medium"
              @click="handleCreate"
            >
              Add
            </button>
          </div>
        </div>
      </Transition>

      <!-- Loading skeleton -->
      <div v-if="loading" class="px-3 space-y-1">
        <div v-for="i in 3" :key="i" class="h-7 rounded-lg bg-muted/40 animate-pulse" />
      </div>

      <div v-else>
        <!-- Ungrouped channels -->
        <nav class="px-2 space-y-0.5">
          <template v-for="ch in ungroupedPublicChannels" :key="ch.id">
            <div
              v-if="renamingId === ch.id"
              class="flex items-center gap-1.5 rounded-lg border border-primary bg-background px-2 py-1 mx-0"
            >
              <Icon :name="channelIcon(ch)" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                :id="`rename-${ch.id}`"
                v-model="renameValue"
                class="flex-1 bg-transparent text-xs outline-none"
                @keydown.enter="commitRename"
                @keydown.escape="renamingId = null"
                @blur="commitRename"
              />
            </div>
            <div v-else class="relative group/ch">
              <NuxtLink
                :to="`/messages/${ch.id}`"
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors"
                :class="[
                  isActive(ch.id) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  canEditContent ? 'pr-7' : '',
                ]"
                @click="emit('select', ch)"
              >
                <Icon :name="channelIcon(ch)" class="h-3.5 w-3.5 shrink-0" />
                <span class="flex-1 truncate">{{ ch.slug ?? ch.title }}</span>
                <span
                  v-if="unreadCounts[ch.id]"
                  class="h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0"
                >{{ unreadCounts[ch.id] }}</span>
              </NuxtLink>
              <div
                v-if="canEditContent"
                class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/ch:opacity-100 transition-opacity z-10"
              >
                <UiDropdownMenu>
                  <UiDropdownMenuTrigger as-child>
                    <button type="button" class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/80" aria-label="Channel options" @click.prevent.stop>
                      <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                    </button>
                  </UiDropdownMenuTrigger>
                  <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                    <UiDropdownMenuItem @click="startRename(ch)">
                      <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />Rename
                    </UiDropdownMenuItem>
                    <UiDropdownMenuSub>
                      <UiDropdownMenuSubTrigger>
                        <Icon name="lucide:folder" class="mr-2 h-4 w-4" />Move to folder
                      </UiDropdownMenuSubTrigger>
                      <UiDropdownMenuSubContent class="w-44">
                        <UiDropdownMenuItem v-for="f in channelFolders" :key="f" @click="moveToFolder(ch, f)">
                          <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />{{ f }}
                        </UiDropdownMenuItem>
                        <UiDropdownMenuSeparator v-if="channelFolders.length" />
                        <UiDropdownMenuItem @click="promptNewFolder(ch)">
                          <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />New folder…
                        </UiDropdownMenuItem>
                      </UiDropdownMenuSubContent>
                    </UiDropdownMenuSub>
                    <UiDropdownMenuSeparator />
                    <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="deleteTarget = ch">
                      <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />Delete
                    </UiDropdownMenuItem>
                  </UiDropdownMenuContent>
                </UiDropdownMenu>
              </div>
            </div>
          </template>
          <div v-if="!publicChannels.length" class="px-2 py-1.5 text-xs text-muted-foreground/60 italic">
            No channels yet
          </div>
        </nav>

        <!-- New folder input -->
        <Transition name="slide-down">
          <div v-if="newFolderFor" class="px-3 py-1.5">
            <p class="text-[10px] text-muted-foreground mb-1">Move <span class="font-medium text-foreground">{{ newFolderFor.title }}</span> to new folder:</p>
            <div class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
              <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                id="new-folder-input"
                v-model="newFolderName"
                placeholder="Folder name"
                class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                @keydown.enter="commitNewFolder"
                @keydown.escape="newFolderFor = null"
              />
              <button :disabled="!newFolderName.trim() || creatingFolder" class="text-xs text-primary disabled:opacity-40 hover:text-primary/80 transition-colors font-medium" @click="commitNewFolder">
                Create
              </button>
            </div>
          </div>
        </Transition>

        <!-- Folder groups -->
        <div v-for="group in channelsByFolder" :key="group.folder" class="mt-1">
          <button
            type="button"
            class="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            @click="toggleFolder(group.folder)"
          >
            <Icon name="lucide:chevron-right" class="h-3 w-3 transition-transform duration-150" :class="isFolderOpen(group.folder) ? 'rotate-90' : ''" />
            <Icon name="lucide:folder" class="h-3 w-3" />
            <span class="flex-1 text-left truncate">{{ group.folder }}</span>
          </button>
          <Transition name="slide-down">
            <nav v-if="isFolderOpen(group.folder)" class="px-2 space-y-0.5 pl-5">
              <template v-for="ch in group.channels" :key="ch.id">
                <div v-if="renamingId === ch.id" class="flex items-center gap-1.5 rounded-lg border border-primary bg-background px-2 py-1">
                  <Icon :name="channelIcon(ch)" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input :id="`rename-${ch.id}`" v-model="renameValue" class="flex-1 bg-transparent text-xs outline-none" @keydown.enter="commitRename" @keydown.escape="renamingId = null" @blur="commitRename" />
                </div>
                <div v-else class="relative group/ch">
                  <NuxtLink
                    :to="`/messages/${ch.id}`"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors"
                    :class="[
                      isActive(ch.id) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      canEditContent ? 'pr-7' : '',
                    ]"
                    @click="emit('select', ch)"
                  >
                    <Icon :name="channelIcon(ch)" class="h-3.5 w-3.5 shrink-0" />
                    <span class="flex-1 truncate">{{ ch.slug ?? ch.title }}</span>
                    <span v-if="unreadCounts[ch.id]" class="h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{{ unreadCounts[ch.id] }}</span>
                  </NuxtLink>
                  <div v-if="canEditContent" class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/ch:opacity-100 transition-opacity z-10">
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <button type="button" class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/80" aria-label="Channel options" @click.prevent.stop>
                          <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                        </button>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                        <UiDropdownMenuItem @click="startRename(ch)">
                          <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />Rename
                        </UiDropdownMenuItem>
                        <UiDropdownMenuSub>
                          <UiDropdownMenuSubTrigger>
                            <Icon name="lucide:folder" class="mr-2 h-4 w-4" />Move to folder
                          </UiDropdownMenuSubTrigger>
                          <UiDropdownMenuSubContent class="w-44">
                            <UiDropdownMenuItem v-for="f in channelFolders" :key="f" @click="moveToFolder(ch, f)">
                              <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />{{ f }}
                            </UiDropdownMenuItem>
                            <UiDropdownMenuSeparator v-if="channelFolders.length" />
                            <UiDropdownMenuItem @click="promptNewFolder(ch)">
                              <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />New folder…
                            </UiDropdownMenuItem>
                            <UiDropdownMenuSeparator />
                            <UiDropdownMenuItem @click="moveToFolder(ch, null)">
                              <Icon name="lucide:folder-minus" class="mr-2 h-4 w-4" />Remove from folder
                            </UiDropdownMenuItem>
                          </UiDropdownMenuSubContent>
                        </UiDropdownMenuSub>
                        <UiDropdownMenuSeparator />
                        <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="deleteTarget = ch">
                          <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />Delete
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                </div>
              </template>
            </nav>
          </Transition>
        </div>
      </div>
    </div>

    <!-- DIRECT MESSAGES section -->
    <div v-if="dms.length" class="shrink-0 mt-4">
      <div class="px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Direct Messages</span>
      </div>
      <nav class="px-2 space-y-0.5">
        <NuxtLink
          v-for="ch in dms"
          :key="ch.id"
          :to="`/messages/${ch.id}`"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
          :class="isActive(ch.id)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="emit('select', ch)"
        >
          <div class="relative shrink-0">
            <div class="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {{ dmLabel(ch).slice(0, 1).toUpperCase() }}
            </div>
          </div>
          <span class="flex-1 truncate">{{ dmLabel(ch) }}</span>
          <span
            v-if="unreadCounts[ch.id]"
            class="h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0"
          >
            {{ unreadCounts[ch.id] }}
          </span>
        </NuxtLink>
      </nav>
    </div>

    <!-- THREADS section -->
    <div v-if="threads.length" class="shrink-0 mt-4">
      <div class="px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Threads</span>
      </div>
      <nav class="px-2 space-y-0.5">
        <NuxtLink
          v-for="ch in threads"
          :key="ch.id"
          :to="`/messages/${ch.id}`"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
          :class="isActive(ch.id)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="emit('select', ch)"
        >
          <Icon name="lucide:git-branch" class="h-3.5 w-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ ch.title }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="flex-1" />
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.15s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

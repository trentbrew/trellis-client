<script setup lang="ts">
  import { canChangeRole, canRemoveMember } from '~/lib/permissions'

  definePageMeta({
    title: 'Members',
    icon: 'lucide:users-round',
    layout: 'default',
  })

  const db = useInstantDb()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()
  const currentOrg = useState<any>('currentOrg')
  const { isUserOnline } = usePresence()

  // ── Members data ───────────────────────────────────────────────────
  const members = ref<any[]>([])
  const loading = ref(true)

  const activeMembers = computed(() => members.value.filter((m) => m.status === 'active'))
  const pendingMembers = computed(() => members.value.filter((m) => m.status === 'pending'))

  const fetchMembers = () => {
    if (!currentOrg.value?.id) {
      loading.value = false
      return
    }

    return db.subscribeQuery(
      {
        members: {
          $: {
            where: {
              orgId: currentOrg.value.id,
            },
          },
        },
      },
      (result: any) => {
        members.value = result.data?.members || []
        loading.value = false
      },
    )
  }

  let unsub: (() => void) | null = null

  watch(
    () => currentOrg.value?.id,
    () => {
      unsub?.()
      loading.value = true
      unsub = fetchMembers() || null
    },
    { immediate: true },
  )

  onUnmounted(() => unsub?.())

  // ── Invite form ────────────────────────────────────────────────────
  const showInviteForm = ref(false)
  const inviteInput = ref('')
  const inviteEmails = ref<string[]>([])
  const inviteSending = ref(false)
  const inviteResults = ref<{ email: string; status: string; inviteUrl?: string }[]>([])

  const addInviteEmail = () => {
    const raw = inviteInput.value.trim().toLowerCase()
    if (!raw) return
    const currentUserEmail = (user.value as any)?.email?.toLowerCase()
    const emails = raw.split(/[,;\s]+/).filter((e) => {
      if (!e.includes('@') || inviteEmails.value.includes(e)) return false
      if (currentUserEmail && e === currentUserEmail) {
        $toast?.error('You cannot invite yourself')
        return false
      }
      return true
    })
    if (emails.length) inviteEmails.value.push(...emails)
    inviteInput.value = ''
  }

  const removeInviteEmail = (email: string) => {
    inviteEmails.value = inviteEmails.value.filter((e) => e !== email)
  }

  const currentWorld = useState<any>('currentWorld')

  const sendInvites = async () => {
    if (!inviteEmails.value.length || !currentOrg.value?.id) return
    inviteSending.value = true
    try {
      const resp = await $fetch('/api/invite', {
        method: 'POST',
        body: {
          emails: inviteEmails.value,
          orgId: currentOrg.value.id,
          orgName: currentOrg.value.name || '',
          appId: currentWorld.value?.id || '',
          worldId: currentWorld.value?.id || '',
          worldName: currentWorld.value?.name || '',
          inviterId: user.value?.id,
          inviterName: (user.value as any)?.name || (user.value as any)?.email,
        },
      })
      const results = (resp as any)?.results || []
      const sent = results.filter((r: any) => r.status === 'sent').length
      const errors = results.filter((r: any) => r.status === 'error').length
      if (sent > 0) $toast?.success(`${sent} invite${sent > 1 ? 's' : ''} sent!`)
      if (errors > 0) $toast?.error(`${errors} invite${errors > 1 ? 's' : ''} failed`)
      inviteResults.value = results
      inviteEmails.value = []
    } catch (err: any) {
      console.error('[members] invite error:', err)
      $toast?.error(err?.message || 'Failed to send invites')
    } finally {
      inviteSending.value = false
    }
  }

  // ── Role management ────────────────────────────────────────────────
  const { userRole } = useUserRole()

  // Roles available for assignment (owner is not assignable — use transfer)
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Can manage workspace settings, members, and all content' },
    { value: 'member', label: 'Member', description: 'Can create, edit, and manage content' },
    { value: 'guest', label: 'Guest', description: 'Read-only access to shared content' },
  ] as const

  // Sole owner detection — blocks self-removal / demotion
  const isSoleOwner = computed(() => {
    const owners = members.value.filter((m: any) => m.role === 'owner' && m.status === 'active')
    return owners.length <= 1
  })

  const updateRole = async (member: any, newRole: string) => {
    if (!canChangeRole(userRole.value, member.role || 'member', newRole as any)) {
      $toast?.error('You do not have permission to change this role')
      return
    }
    try {
      await db.transact([db.tx.members[member.id].update({ role: newRole })])
      $toast?.success(`Updated ${member.email || member.name} to ${newRole}`)
    } catch {
      $toast?.error('Failed to update role')
    }
  }

  const removeMember = async (member: any) => {
    if (!canRemoveMember(userRole.value, member.role || 'member', member.role === 'owner' && isSoleOwner.value)) {
      $toast?.error('You do not have permission to remove this member')
      return
    }
    try {
      await db.transact([db.tx.members[member.id].delete()])
      $toast?.success(`Removed ${member.email || member.name}`)
    } catch {
      $toast?.error('Failed to remove member')
    }
  }

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      $toast?.success('Invite link copied!')
    } catch {
      $toast?.error('Failed to copy link')
    }
  }

  const buildInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/accept?token=${token}`
  }

  const resendInvite = async (member: any) => {
    if (!member.email) return
    try {
      await db.auth.sendMagicCode({ email: member.email })
      $toast?.success(`Invite resent to ${member.email}`)
    } catch {
      $toast?.error('Failed to resend invite')
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  const getInitials = (value: string) => {
    const cleaned = value.trim()
    if (!cleaned) return '?'
    const emailPrefix = cleaned.includes('@') ? cleaned.split('@')[0]! : cleaned
    const parts = emailPrefix.split(/[\s._-]+/g).filter(Boolean)
    const first = parts[0]?.[0] ?? '?'
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
    return `${first}${second}`.toUpperCase().slice(0, 2)
  }

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const isCurrentUser = (member: any) => member.userId === user.value?.id
</script>

<template>
  <Page
    variant="settings"
    title="Members"
    subtitle="Settings"
    description="Manage team members, roles, and permissions"
    icon="lucide:users-round">
    <div class="space-y-6">
      <!-- Header row -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-foreground text-lg font-semibold">Team members</h2>
          <p class="text-muted-foreground text-sm">
            {{ activeMembers.length }} active{{ pendingMembers.length > 0 ? `, ${pendingMembers.length} pending` : '' }}
          </p>
        </div>
        <UiButton size="sm" @click="showInviteForm = !showInviteForm">
          <Icon name="lucide:user-plus" class="mr-2 h-4 w-4" />
          Invite
        </UiButton>
      </div>

      <!-- Invite form -->
      <div
        v-if="showInviteForm"
        class="border-border bg-card rounded-xl border p-4 space-y-3">
        <div class="text-sm font-medium text-foreground">Invite by email</div>
        <div class="flex gap-2">
          <input
            v-model="inviteInput"
            type="email"
            placeholder="name@example.com"
            class="bg-background border-border text-foreground flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            @keydown.enter.prevent="addInviteEmail"
            @keydown.tab.prevent="addInviteEmail" />
          <UiButton size="sm" variant="outline" @click="addInviteEmail">Add</UiButton>
        </div>
        <div v-if="inviteEmails.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="email in inviteEmails"
            :key="email"
            class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {{ email }}
            <button
              type="button"
              class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
              @click="removeInviteEmail(email)">
              <Icon name="lucide:x" class="h-3 w-3" />
            </button>
          </span>
        </div>

        <!-- Invite results with copyable links -->
        <div v-if="inviteResults.length" class="space-y-2">
          <div
            v-for="result in inviteResults"
            :key="result.email"
            class="space-y-1">
            <div class="flex items-center gap-2 text-xs">
              <Icon
                :name="result.status === 'sent' ? 'lucide:check-circle' : 'lucide:alert-circle'"
                :class="result.status === 'sent' ? 'text-emerald-500' : 'text-red-400'"
                class="h-3.5 w-3.5 shrink-0" />
              <span class="text-muted-foreground">{{ result.email }}</span>
            </div>
            <div v-if="result.inviteUrl" class="flex items-center gap-1.5 pl-5">
              <input
                :value="result.inviteUrl"
                readonly
                class="bg-muted/50 text-muted-foreground flex-1 rounded border border-border px-2 py-1 text-[10px] font-mono truncate"
                @click="($event.target as HTMLInputElement).select()" />
              <button
                type="button"
                class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Copy invite link"
                @click="copyInviteUrl(result.inviteUrl)">
                <Icon name="lucide:copy" class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UiButton size="sm" variant="ghost" @click="showInviteForm = false; inviteEmails = []; inviteResults = []">
            Cancel
          </UiButton>
          <UiButton
            size="sm"
            :disabled="!inviteEmails.length || inviteSending"
            @click="sendInvites">
            {{ inviteSending ? 'Sending…' : `Send ${inviteEmails.length || ''} invite${inviteEmails.length !== 1 ? 's' : ''}` }}
          </UiButton>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="border-border rounded-xl border p-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-full bg-muted" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-32 rounded bg-muted" />
              <div class="h-3 w-48 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <!-- No org -->
      <div v-else-if="!currentOrg?.id" class="border-border bg-card rounded-xl border p-8 text-center">
        <Icon name="lucide:building-2" class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
        <p class="text-muted-foreground text-sm">No organization selected. Complete onboarding to manage members.</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="members.length === 0" class="border-border bg-card rounded-xl border p-8 text-center space-y-3">
        <Icon name="lucide:users-round" class="text-muted-foreground mx-auto h-10 w-10" />
        <div>
          <p class="text-foreground font-medium">No team members yet</p>
          <p class="text-muted-foreground text-sm">Invite teammates to collaborate in your workspace.</p>
        </div>
        <UiButton size="sm" @click="showInviteForm = true">
          <Icon name="lucide:user-plus" class="mr-2 h-4 w-4" />
          Send your first invite
        </UiButton>
      </div>

      <!-- Members list -->
      <template v-else>
        <!-- Pending invites -->
        <div v-if="pendingMembers.length > 0" class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Pending invites
          </div>
          <div class="border-border rounded-xl border divide-y divide-border overflow-hidden">
            <div
              v-for="member in pendingMembers"
              :key="member.id"
              class="flex items-center gap-3 px-4 py-3 bg-card">
              <!-- Avatar -->
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <Icon name="lucide:clock" class="h-4 w-4" />
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-foreground truncate">{{ member.email }}</div>
                <div class="text-xs text-muted-foreground">
                  Invited {{ member.invitedAt ? timeAgo(member.invitedAt) : '' }}
                  <span v-if="member.inviterName"> by {{ member.inviterName }}</span>
                </div>
              </div>
              <!-- Actions -->
              <div class="flex items-center gap-1.5 shrink-0">
                <UiButton v-if="member.inviteToken" size="sm" variant="ghost" class="h-8 text-xs" @click="copyInviteUrl(buildInviteUrl(member.inviteToken))">
                  <Icon name="lucide:link" class="mr-1 h-3 w-3" />
                  Copy link
                </UiButton>
                <UiButton size="sm" variant="ghost" class="h-8 text-xs" @click="resendInvite(member)">
                  Resend
                </UiButton>
                <UiButton size="sm" variant="ghost" class="h-8 text-xs text-destructive hover:text-destructive" @click="removeMember(member)">
                  Revoke
                </UiButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Active members -->
        <div v-if="activeMembers.length > 0" class="space-y-2">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Active members
          </div>
          <div class="border-border rounded-xl border divide-y divide-border overflow-hidden">
            <div
              v-for="member in activeMembers"
              :key="member.id"
              class="flex items-center gap-3 px-4 py-3 bg-card">
              <!-- Avatar with online indicator -->
              <div class="relative shrink-0">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {{ getInitials(member.name || member.email || '') }}
                </div>
                <span
                  v-if="member.userId && isUserOnline(member.userId)"
                  class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500"
                  title="Online" />
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-foreground truncate">
                    {{ member.name || member.email }}
                  </span>
                  <span
                    v-if="isCurrentUser(member)"
                    class="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    you
                  </span>
                </div>
                <div class="text-xs text-muted-foreground truncate">
                  {{ member.email }}
                  <span class="text-muted-foreground/50 mx-1">&middot;</span>
                  <span class="capitalize">{{ member.role || 'member' }}</span>
                </div>
              </div>
              <!-- Role selector -->
              <div v-if="!isCurrentUser(member)" class="flex items-center gap-1.5 shrink-0">
                <UiDropdownMenu>
                  <UiDropdownMenuTrigger as-child>
                    <UiButton size="sm" variant="ghost" class="h-8 text-xs capitalize">
                      {{ member.role || 'member' }}
                      <Icon name="lucide:chevron-down" class="ml-1 h-3 w-3" />
                    </UiButton>
                  </UiDropdownMenuTrigger>
                  <UiDropdownMenuContent align="end" class="w-64">
                    <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Change role</div>
                    <UiDropdownMenuItem
                      v-for="role in roleOptions"
                      :key="role.value"
                      :disabled="member.role === role.value"
                      class="flex-col items-start gap-0.5 py-2"
                      @click="updateRole(member, role.value)">
                      <div class="flex w-full items-center justify-between">
                        <span class="font-medium">{{ role.label }}</span>
                        <Icon v-if="member.role === role.value" name="lucide:check" class="h-4 w-4 text-primary" />
                      </div>
                      <span class="text-xs text-muted-foreground font-normal">{{ role.description }}</span>
                    </UiDropdownMenuItem>
                    <UiDropdownMenuSeparator />
                    <UiDropdownMenuItem
                      class="text-destructive focus:text-destructive"
                      @click="removeMember(member)">
                      <Icon name="lucide:user-minus" class="mr-2 h-4 w-4" />
                      Remove
                    </UiDropdownMenuItem>
                  </UiDropdownMenuContent>
                </UiDropdownMenu>
              </div>
              <div v-else class="shrink-0">
                <span class="text-xs text-muted-foreground capitalize">{{ member.role || 'member' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Page>
</template>

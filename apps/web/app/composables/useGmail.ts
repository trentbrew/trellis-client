/**
 * useGmail — Gmail integration composable.
 *
 * Responsibilities:
 * - Read stored connection from useIntegrations()
 * - Fetch thread list + full threads via server proxy
 * - Send/reply via server proxy
 * - List + create + modify labels via server proxy
 * - Persist an email as a TQL `email` entity (for graph linking)
 * - Link an email to any workspace entity via a `references` TQL link
 *
 * Design notes:
 * - We do NOT auto-sync the entire inbox to TQL (that would be enormous).
 *   Emails are persisted on demand when the user explicitly links them.
 * - The thread list + viewer pull live from Gmail on each navigation —
 *   this keeps Trellis lean and avoids staleness issues.
 */

import type { IntegrationConnection } from '~/types/database'
import { entityId as toEntityId } from '~/lib/tql-namespace'
import { startIntegrationOAuth } from '~/lib/integration-oauth'

// ── Public shapes (consumed by pages/mail/index.vue) ──────────────────

export interface GmailThreadSummary {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  unread: boolean
  labelIds: string[]
}

export interface GmailMessage {
  id: string
  messageId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  snippet: string
  labelIds: string[]
  bodyText?: string
  bodyHtml?: string
}

export interface GmailThreadFull {
  id: string
  labelIds: string[]
  messages: GmailMessage[]
}

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messagesTotal?: number
  messagesUnread?: number
}

export type GmailSyncStatus = 'idle' | 'syncing' | 'error'

export interface SendMessageOptions {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  threadId?: string
  inReplyTo?: string
  references?: string
  isHtml?: boolean
}

// ── Composable ────────────────────────────────────────────────────────

export function useGmail() {
  const { mutate, fetchNode } = useTrellisGraph()
  const { getConnection, getConnections } = useIntegrations()
  const { user } = useInstantAuth()

  // ── Auth headers for server-side ownership checks ───────────────────
  //
  // Every /api/integrations/gmail/* request carries the caller's user id
  // so the server can verify it matches the connection's stored userId
  // fact (see `server/utils/connection-auth.ts`). Without this header,
  // the server treats the request as anonymous and denies access to any
  // owned connection.
  const authHeaders = computed<Record<string, string>>(() => {
    const uid = user.value?.id
    const headers: Record<string, string> = {}
    if (uid) headers['X-User-Id'] = uid
    return headers
  })

  // ── Reactive state ────────────────────────────────────────────────

  const syncStatus = ref<GmailSyncStatus>('idle')
  const syncError = ref<string | null>(null)
  const lastSyncAt = ref<string | null>(null)

  // ── Connection accessors ─────────────────────────────────────────

  const connections = computed<IntegrationConnection[]>(() => getConnections('gmail'))

  const activeConnections = computed(() => connections.value.filter((c) => c.connectionStatus === 'connected'))

  const connection = computed<IntegrationConnection | undefined>(() => getConnection('gmail'))

  const isConnected = computed(() => activeConnections.value.length > 0)

  function resolveConnectionId(connectionId?: string): string | null {
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    if (!conn || conn.connectionStatus !== 'connected') return null
    return conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}`
  }

  // ── Thread list ──────────────────────────────────────────────────

  async function fetchThreads(
    opts: {
      labelId?: string
      q?: string
      maxResults?: number
      pageToken?: string
      connectionId?: string
    } = {},
  ): Promise<{ threads: GmailThreadSummary[]; nextPageToken?: string }> {
    const connId = resolveConnectionId(opts.connectionId)
    if (!connId) throw new Error('Not connected to Gmail')

    const params = new URLSearchParams({ connectionId: connId })
    if (opts.labelId) params.set('labelId', opts.labelId)
    if (opts.q) params.set('q', opts.q)
    if (opts.maxResults) params.set('maxResults', String(opts.maxResults))
    if (opts.pageToken) params.set('pageToken', opts.pageToken)

    const response = await $fetch<{ threads: GmailThreadSummary[]; nextPageToken?: string }>(
      `/api/integrations/gmail/messages?${params.toString()}`,
      { headers: authHeaders.value },
    )
    return { threads: response.threads || [], nextPageToken: response.nextPageToken }
  }

  // ── Single thread ────────────────────────────────────────────────

  async function fetchThread(threadId: string, connectionId?: string): Promise<GmailThreadFull> {
    const connId = resolveConnectionId(connectionId)
    if (!connId) throw new Error('Not connected to Gmail')

    const params = new URLSearchParams({ connectionId: connId, threadId })
    return await $fetch<GmailThreadFull>(`/api/integrations/gmail/messages?${params.toString()}`, {
      headers: authHeaders.value,
    })
  }

  // ── Send / reply ─────────────────────────────────────────────────

  async function sendMessage(
    opts: SendMessageOptions,
    connectionId?: string,
  ): Promise<{ messageId: string; threadId: string }> {
    const connId = resolveConnectionId(connectionId)
    if (!connId) throw new Error('Not connected to Gmail')

    const response = await $fetch<{ ok: boolean; messageId: string; threadId: string }>(
      '/api/integrations/gmail/send',
      {
        method: 'POST',
        headers: authHeaders.value,
        body: { connectionId: connId, ...opts },
      },
    )

    return { messageId: response.messageId, threadId: response.threadId }
  }

  // ── Labels ───────────────────────────────────────────────────────

  async function listLabels(connectionId?: string): Promise<GmailLabel[]> {
    const connId = resolveConnectionId(connectionId)
    if (!connId) return []

    try {
      const response = await $fetch<{ labels: GmailLabel[] }>(
        `/api/integrations/gmail/labels?connectionId=${encodeURIComponent(connId)}`,
        { headers: authHeaders.value },
      )
      return response.labels || []
    } catch (err) {
      console.error('[useGmail] Failed to list labels:', err)
      return []
    }
  }

  async function createLabel(name: string, connectionId?: string): Promise<GmailLabel | null> {
    const connId = resolveConnectionId(connectionId)
    if (!connId) throw new Error('Not connected to Gmail')

    try {
      const response = await $fetch<{ ok: boolean; label: GmailLabel }>('/api/integrations/gmail/labels', {
        method: 'POST',
        headers: authHeaders.value,
        body: { connectionId: connId, action: 'create', name },
      })
      return response.label
    } catch (err) {
      console.error('[useGmail] Failed to create label:', err)
      return null
    }
  }

  async function modifyLabels(opts: {
    messageId?: string
    threadId?: string
    addLabelIds?: string[]
    removeLabelIds?: string[]
    connectionId?: string
  }): Promise<void> {
    const connId = resolveConnectionId(opts.connectionId)
    if (!connId) throw new Error('Not connected to Gmail')

    await $fetch('/api/integrations/gmail/labels', {
      method: 'POST',
      headers: authHeaders.value,
      body: {
        connectionId: connId,
        action: 'modify',
        messageId: opts.messageId,
        threadId: opts.threadId,
        addLabelIds: opts.addLabelIds || [],
        removeLabelIds: opts.removeLabelIds || [],
      },
    })
  }

  // ── TQL persistence (for entity linking) ────────────────────────

  /**
   * Persists a Gmail thread's first message as a TQL `email` entity so
   * it can be linked to workspace entities. Idempotent — re-upserts if
   * the same thread is saved again.
   *
   * Entity ID: `entity:gmail-<threadId>`
   */
  async function persistThreadToTql(thread: GmailThreadFull, connectionId?: string): Promise<string> {
    const firstMsg = thread.messages[0]
    if (!firstMsg) throw new Error('Thread has no messages')

    const eid = toEntityId(`gmail-${thread.id}`)

    // Resolve provenance connection up-front so we can persist the id as an
    // attribute on the email (for multi-account disambiguation) and then
    // create the graph edge after the node exists.
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    const connEntityId = conn ? (conn.id.startsWith('entity:') ? conn.id : toEntityId(conn.id)) : undefined

    // Check whether the entity already exists so we can avoid the
    // destructive `createNode` path — which wipes ALL facts including
    // any AI enrichment written by the gmail-notifier pipeline. We only
    // do a full create on the very first persistence of a thread.
    let existed = false
    try {
      const existing = await fetchNode(eid)
      existed = !!existing?.node
    } catch {
      existed = false
    }

    if (!existed) {
      const data: Record<string, any> = {
        type: 'email',
        title: firstMsg.subject || '(no subject)',
        subject: firstMsg.subject,
        snippet: firstMsg.snippet,
        from: firstMsg.from,
        to: firstMsg.to,
        cc: firstMsg.cc,
        date: firstMsg.date,
        labelIds: thread.labelIds,
        threadId: thread.id,
        messageId: firstMsg.messageId,
        isRead: !thread.labelIds.includes('UNREAD'),
        isStarred: thread.labelIds.includes('STARRED'),
        bodyText: firstMsg.bodyText,
        bodyHtml: firstMsg.bodyHtml,
        source: 'gmail',
        gmailMessageId: firstMsg.id,
        gmailThreadId: thread.id,
        pinned: false,
        ...(connEntityId ? { connectionId: connEntityId } : {}),
      }

      await mutate({
        action: 'createNode',
        entityId: eid,
        type: 'entity',
        data,
      })

      // Provenance edge: persisted email → source integration connection.
      // Idempotent — kernel dedupes duplicate edges.
      if (connEntityId) {
        await mutate({
          action: 'link',
          e1: eid,
          relation: 'derivedFrom',
          e2: connEntityId,
        })
      }
    } else {
      // Refresh only the volatile Gmail-owned fields on re-open — label
      // changes (starred, read, folders) should still sync, but AI
      // enrichment + user-owned fields (tags, references) stay intact.
      await mutate({
        action: 'updateNode',
        entityId: eid,
        type: 'entity',
        data: {
          labelIds: thread.labelIds,
          isRead: !thread.labelIds.includes('UNREAD'),
          isStarred: thread.labelIds.includes('STARRED'),
          snippet: firstMsg.snippet,
        },
      })
    }

    return eid
  }

  /**
   * Link a Gmail thread to another workspace entity via a `references`
   * link in the TQL graph. Persists the thread first if it doesn't
   * already exist as an entity.
   */
  async function linkThreadToEntity(
    thread: GmailThreadFull,
    targetEntityId: string,
    relation: 'references' | 'mentions' = 'references',
  ): Promise<void> {
    const emailEntityId = await persistThreadToTql(thread)
    const targetId = targetEntityId.startsWith('entity:') ? targetEntityId : toEntityId(targetEntityId)

    await mutate({
      action: 'link',
      e1: emailEntityId,
      relation,
      e2: targetId,
    })
  }

  // ── Connect / disconnect ─────────────────────────────────────────

  function connect(opts?: { email?: string; returnTo?: string }): void {
    const route = useRoute()
    startIntegrationOAuth('gmail', {
      userId: user.value?.id,
      email: opts?.email,
      returnTo: opts?.returnTo ?? route.fullPath,
    })
  }

  async function disconnect(connectionId?: string): Promise<void> {
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    if (!conn) return

    try {
      await $fetch('/api/integrations/gmail/revoke', {
        method: 'POST',
        headers: authHeaders.value,
        body: { connectionId: conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}` },
      })
    } catch (err) {
      console.error('[useGmail] Disconnect failed:', err)
      throw err
    }
  }

  return {
    // State
    connection,
    connections,
    activeConnections,
    isConnected,
    syncStatus: computed(() => syncStatus.value),
    syncError: computed(() => syncError.value),
    lastSyncAt: computed(() => lastSyncAt.value),

    // Live reads
    fetchThreads,
    fetchThread,

    // Write / send
    sendMessage,

    // Labels
    listLabels,
    createLabel,
    modifyLabels,

    // Graph linkage
    persistThreadToTql,
    linkThreadToEntity,

    // Connect lifecycle
    connect,
    disconnect,
  }
}

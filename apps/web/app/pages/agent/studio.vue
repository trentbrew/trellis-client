<script setup lang="ts">
  /**
   * /agent/studio — Workshop → Showroom artifact publish flow
   * (Campus Substrate, slice 1.5).
   *
   * Demonstrates the zone-override flow end-to-end:
   *   1. Create artifact drafts → server tags them with the Workshop
   *      zone (derived from this route's /agent prefix).
   *   2. Publish action → per-call opts.zoneId = Showroom overrides the
   *      route-derived zone, so the mutation event carries the target
   *      Showroom context. Server-side zone-guard evaluates the write
   *      against the Showroom's grants (members may publish).
   *   3. Opt-in Decision capture on publish → creates an audit-trail
   *      `decision` entity with toolInput, byAgent, inZone = Showroom.
   */
  import { useTrellisGraph } from '~/composables/useTrellisGraph'
  import { CAMPUS_ZONES } from '~/composables/useZoneContext'

  definePageMeta({
    title: 'Studio',
    icon: 'lucide:hammer',
  })

  interface Artifact {
    '@id': string
    title?: string
    content?: string
    visibility?: 'draft' | 'public' | string
    publishedAt?: string
    sourceZone?: string
    zoneId?: string
    createdAt?: string
  }

  const { query, fetchNodes, mutate } = useTrellisGraph()

  // Query every artifact id — hydrate nodes afterwards for fields.
  const artifactQuery = `FIND entity AS ?a WHERE ?a.type = "artifact"`
  const { data: artifactIds, loading: idsLoading } = query(artifactQuery)

  const artifacts = ref<Artifact[]>([])
  const hydrating = ref(false)

  watch(
    artifactIds,
    async (rows) => {
      if (!rows || rows.length === 0) {
        artifacts.value = []
        return
      }
      try {
        hydrating.value = true
        const ids = (rows as any[]).map((r) => r['?a']).filter(Boolean)
        const nodes = await fetchNodes(ids)
        artifacts.value = nodes as Artifact[]
      } catch (err) {
        console.error('[studio] hydrate failed:', err)
      } finally {
        hydrating.value = false
      }
    },
    { immediate: true },
  )

  const drafts = computed(() => artifacts.value.filter((a) => a.visibility !== 'public'))
  const published = computed(() => artifacts.value.filter((a) => a.visibility === 'public'))

  // ── Create draft ───────────────────────────────────────────────────
  const newTitle = ref('')
  const newContent = ref('')
  const creating = ref(false)

  async function createDraft() {
    if (!newTitle.value.trim()) return
    creating.value = true
    try {
      const id = `entity:artifact-${crypto.randomUUID().slice(0, 8)}`
      await mutate(
        {
          action: 'createNode',
          entityId: id,
          type: 'entity',
          data: {
            type: 'artifact',
            title: newTitle.value.trim(),
            content: newContent.value.trim(),
            visibility: 'draft',
            createdAt: new Date().toISOString(),
          },
        },
        // No zoneId override — route-derived Workshop is what we want.
        { captureDecision: true },
      )
      newTitle.value = ''
      newContent.value = ''
    } catch (err: any) {
      console.error('[studio] createDraft failed:', err?.message || err)
    } finally {
      creating.value = false
    }
  }

  // ── Publish: override zone to Showroom on the mutation ─────────────
  const publishing = ref<string | null>(null)

  async function publish(a: Artifact) {
    publishing.value = a['@id']
    try {
      await mutate(
        {
          action: 'updateNode',
          entityId: a['@id'],
          type: 'entity',
          data: {
            visibility: 'public',
            publishedAt: new Date().toISOString(),
            // Record where it came from for audit
            sourceZone: a.zoneId || CAMPUS_ZONES.workshop,
          },
        },
        // KEY MOVE: explicit Showroom zone header for this mutation,
        // so the server tags the MutationEvent + (advisory) Decision
        // with Showroom as the acting zone.
        { zoneId: CAMPUS_ZONES.showroom, captureDecision: true },
      )
    } catch (err: any) {
      console.error('[studio] publish failed:', err?.message || err)
    } finally {
      publishing.value = null
    }
  }

  async function unpublish(a: Artifact) {
    publishing.value = a['@id']
    try {
      await mutate(
        {
          action: 'updateNode',
          entityId: a['@id'],
          type: 'entity',
          data: { visibility: 'draft', publishedAt: '' },
        },
        { zoneId: CAMPUS_ZONES.workshop, captureDecision: true },
      )
    } catch (err: any) {
      console.error('[studio] unpublish failed:', err?.message || err)
    } finally {
      publishing.value = null
    }
  }

  async function remove(a: Artifact) {
    if (!confirm(`Delete "${a.title || a['@id']}"?`)) return
    publishing.value = a['@id']
    try {
      await mutate({ action: 'deleteNode', entityId: a['@id'] }, { captureDecision: true })
    } catch (err: any) {
      console.error('[studio] delete failed:', err?.message || err)
    } finally {
      publishing.value = null
    }
  }

  const loading = computed(() => idsLoading.value || hydrating.value)
</script>

<template>
  <Page
    variant="default"
    title="Studio"
    subtitle="Workshop → Showroom"
    description="Draft artifacts in the Workshop, publish them to the Showroom. Zone overrides + decision trails."
    icon="lucide:hammer"
    :fill-height="true">
    <div class="flex h-full flex-col overflow-y-auto">
      <!-- Zone legend -->
      <div class="border-b px-8 py-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:hammer" class="h-3.5 w-3.5 text-emerald-500" />
          <span>Workshop (drafts)</span>
        </div>
        <Icon name="lucide:arrow-right" class="h-3 w-3" />
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:sparkles" class="h-3.5 w-3.5 text-violet-500" />
          <span>Showroom (published)</span>
        </div>
        <span class="ml-auto text-[10px] uppercase tracking-wider">
          Mutations carry X-Trellis-Zone + X-Trellis-Capture-Decision
        </span>
      </div>

      <!-- Create draft -->
      <section class="border-b px-8 py-6">
        <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="lucide:plus-circle" class="h-4 w-4 text-emerald-500" />
          New draft
        </h3>
        <div class="grid gap-2 max-w-2xl">
          <input
            v-model="newTitle"
            type="text"
            placeholder="Title"
            class="rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            :disabled="creating" />
          <textarea
            v-model="newContent"
            placeholder="Content (optional)"
            rows="3"
            class="rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            :disabled="creating"></textarea>
          <button
            class="self-start rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm px-3 py-1.5 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            :disabled="creating || !newTitle.trim()"
            @click="createDraft">
            <Icon v-if="creating" name="lucide:loader-circle" class="h-4 w-4 animate-spin" />
            <Icon v-else name="lucide:hammer" class="h-4 w-4" />
            Create in Workshop
          </button>
        </div>
      </section>

      <!-- Drafts -->
      <section class="border-b px-8 py-6">
        <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="lucide:file-edit" class="h-4 w-4 text-emerald-500" />
          Drafts ({{ drafts.length }})
        </h3>
        <div v-if="loading" class="text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="drafts.length === 0" class="text-xs text-muted-foreground">No drafts yet.</div>
        <ul v-else class="grid gap-2">
          <li
            v-for="a in drafts"
            :key="a['@id']"
            class="rounded border border-border bg-card p-3 flex items-start gap-3">
            <Icon name="lucide:file-text" class="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ a.title || a['@id'] }}</div>
              <div v-if="a.content" class="text-xs text-muted-foreground line-clamp-2 mt-0.5">{{ a.content }}</div>
              <div class="text-[10px] text-muted-foreground/70 mt-1 font-mono">{{ a['@id'] }}</div>
            </div>
            <button
              class="rounded bg-violet-500/10 border border-violet-500/30 text-violet-500 text-xs px-2.5 py-1 hover:bg-violet-500/20 disabled:opacity-50 flex items-center gap-1.5"
              :disabled="publishing === a['@id']"
              @click="publish(a)">
              <Icon v-if="publishing === a['@id']" name="lucide:loader-circle" class="h-3 w-3 animate-spin" />
              <Icon v-else name="lucide:sparkles" class="h-3 w-3" />
              Publish
            </button>
            <button
              class="rounded border border-border text-xs px-2.5 py-1 hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 text-rose-500"
              :disabled="publishing === a['@id']"
              @click="remove(a)">
              <Icon name="lucide:trash-2" class="h-3 w-3" />
            </button>
          </li>
        </ul>
      </section>

      <!-- Published -->
      <section class="px-8 py-6">
        <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="lucide:sparkles" class="h-4 w-4 text-violet-500" />
          Published in Showroom ({{ published.length }})
        </h3>
        <div v-if="loading" class="text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="published.length === 0" class="text-xs text-muted-foreground">Nothing published yet.</div>
        <ul v-else class="grid gap-2">
          <li
            v-for="a in published"
            :key="a['@id']"
            class="rounded border border-violet-500/20 bg-violet-500/5 p-3 flex items-start gap-3">
            <Icon name="lucide:sparkles" class="h-4 w-4 mt-0.5 text-violet-500" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ a.title || a['@id'] }}</div>
              <div v-if="a.content" class="text-xs text-muted-foreground line-clamp-2 mt-0.5">{{ a.content }}</div>
              <div class="text-[10px] text-muted-foreground/70 mt-1 font-mono flex items-center gap-2">
                <span>{{ a['@id'] }}</span>
                <span v-if="a.publishedAt" class="text-violet-500/80">
                  · published {{ new Date(a.publishedAt).toLocaleString() }}
                </span>
              </div>
            </div>
            <button
              class="rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs px-2.5 py-1 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
              :disabled="publishing === a['@id']"
              @click="unpublish(a)">
              <Icon v-if="publishing === a['@id']" name="lucide:loader-circle" class="h-3 w-3 animate-spin" />
              <Icon v-else name="lucide:undo-2" class="h-3 w-3" />
              Unpublish
            </button>
            <button
              class="rounded border border-border text-xs px-2.5 py-1 hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 text-rose-500"
              :disabled="publishing === a['@id']"
              @click="remove(a)">
              <Icon name="lucide:trash-2" class="h-3 w-3" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </Page>
</template>

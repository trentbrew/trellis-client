/**
 * useTemplateInstaller — Provisions a World from a WorkspaceTemplate
 *
 * Handles the full installation flow:
 * 1. Create new World (Application) or target existing one
 * 2. Create ontologies via TQL API
 * 3. Set Application.ontologies
 * 4. Seed SidebarNode entities
 * 5. Seed pages and starter entities
 */

import type {
  WorkspaceTemplate,
  InstallOptions,
  InstallResult,
} from '~/types/workspace-template'
import type { SidebarNodeSeed } from '~/composables/useSidebarTree'

const SIDEBAR_NS = 'sidebar_node'
const sidebarNodeId = (slug: string) => `${SIDEBAR_NS}:${slug}`

// ── Seed sidebar nodes into TQL ────────────────────────────────────────

async function seedSidebarNodes(
  seeds: SidebarNodeSeed[],
  worldId?: string,
): Promise<number> {
  let count = 0

  const createNode = async (seed: SidebarNodeSeed, parentSlug?: string) => {
    const id = sidebarNodeId(seed.id)
    await $fetch('/api/graph/mutate', {
      method: 'POST',
      body: {
        action: 'createNode',
        entityId: id,
        type: SIDEBAR_NS,
        data: {
          label: seed.label,
          icon: seed.icon || 'lucide:circle',
          routePath: seed.routePath || '',
          entityType: seed.entityType || '',
          scope: seed.scope,
          nodeType: seed.nodeType,
          locked: seed.locked ?? false,
          collapsed: seed.collapsed ?? false,
          order: seed.order,
          worldId: worldId || seed.scope,
          sectionKey: seed.sectionKey || '',
          specialItems: seed.specialItems || '',
          editable: seed.editable ?? false,
        },
        agentId: 'template-installer',
      },
    })
    count++

    // Link to parent
    if (parentSlug) {
      const parentId = sidebarNodeId(parentSlug)
      await $fetch('/api/graph/mutate', {
        method: 'POST',
        body: {
          action: 'link',
          e1: parentId,
          relation: 'parentOf',
          e2: id,
          agentId: 'template-installer',
        },
      })
    }
  }

  for (const seed of seeds) {
    await createNode(seed)
    if (seed.children?.length) {
      for (const child of seed.children) {
        await createNode(child, seed.id)
        if (child.children?.length) {
          for (const grandchild of child.children) {
            await createNode(grandchild, child.id)
          }
        }
      }
    }
  }

  return count
}

// ── Create ontologies from template ────────────────────────────────────

async function createOntologiesFromTemplate(
  template: WorkspaceTemplate,
): Promise<number> {
  let count = 0

  for (const entityType of template.entityTypes) {
    const schemaId = `trellis:schema/${entityType.id}`

    // Build fields from entity type definition
    const fields = entityType.fields.map((f) => ({
      name: f.id,
      valueType: mapFieldType(f.type),
      required: f.required ?? false,
    }))

    // Always include a title field
    if (!fields.find((f) => f.name === 'title')) {
      fields.unshift({ name: 'title', valueType: 'title', required: true })
    }

    try {
      await $fetch('/api/graph/ontology', {
        method: 'POST',
        body: {
          schema: {
            '@id': schemaId,
            '@type': 'trellis:Schema',
            version: template.version || '1.0.0',
            tier: 'user',
            entityClass: 'temporal', // default, could be inferred
            label: entityType.name,
            labelPlural: entityType.pluralName,
            icon: entityType.icon,
            fields,
          },
          agentId: 'template-installer',
        },
      })
      count++
    } catch (err: any) {
      // Skip if ontology already exists (409 conflict)
      if (err?.statusCode !== 409) {
        console.error(`[template-installer] Failed to create ontology ${schemaId}:`, err)
      }
    }
  }

  return count
}

// ── Field type mapping ─────────────────────────────────────────────────

function mapFieldType(type: string): string {
  const map: Record<string, string> = {
    text: 'rich_text',
    richtext: 'rich_text',
    number: 'number',
    date: 'date',
    datetime: 'date',
    email: 'email',
    phone: 'phone_number',
    url: 'url',
    select: 'select',
    multiselect: 'multi_select',
    boolean: 'checkbox',
    currency: 'number',
    relation: 'relation',
    user: 'people',
  }
  return map[type] || 'rich_text'
}

// ── Composable ─────────────────────────────────────────────────────────

export function useTemplateInstaller() {
  const installing = ref(false)
  const error = ref<string | null>(null)
  const progress = ref<string>('')

  async function installTemplate(
    template: WorkspaceTemplate,
    options: InstallOptions,
  ): Promise<InstallResult> {
    installing.value = true
    error.value = null
    progress.value = 'Starting installation...'

    const result: InstallResult = {
      success: false,
      ontologiesCreated: 0,
      sidebarNodesSeeded: 0,
      entitiesSeeded: 0,
    }

    try {
      let worldId: string | undefined
      let worldName: string | undefined

      if (options.mode === 'new-world') {
        worldName = options.worldName || template.name
        progress.value = `Creating world "${worldName}"...`

        // Create Application entity via InstantDB
        const { createApplication, currentOrg } = useInstantData()
        if (!currentOrg.value) {
          throw new Error('No organization selected — cannot create world')
        }

        const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const ontologySlugs = template.entityTypes.map((et) => et.id)

        worldId = await createApplication({
          orgId: currentOrg.value.id,
          name: worldName,
          slug: slugify(worldName),
          icon: template.icon || 'lucide:layout-grid',
          color: template.color || '#6366f1',
          description: template.description,
          isPublic: false,
          ontologies: ontologySlugs,
        })
      } else {
        worldId = options.targetWorldId
        worldName = options.worldName
      }

      // Step 1: Create ontologies
      progress.value = `Installing ${template.entityTypes.length} entity types...`
      result.ontologiesCreated = await createOntologiesFromTemplate(template)

      // Step 2: Seed sidebar nodes
      if (template.sidebarTree?.length) {
        progress.value = `Setting up sidebar (${template.sidebarTree.length} sections)...`
        result.sidebarNodesSeeded = await seedSidebarNodes(template.sidebarTree, worldId)
      }

      // Step 3: Seed entities
      if (template.seedData?.length) {
        progress.value = `Creating ${template.seedData.length} starter items...`
        // TODO: Seed entities via useTrellisEntities or direct TQL mutations
        result.entitiesSeeded = 0
      }

      result.success = true
      result.worldId = worldId
      result.worldName = worldName
      progress.value = 'Installation complete!'

      // Auto-navigate to the new world's welcome page
      if (options.mode === 'new-world' && worldId) {
        const { applications, currentApp } = useInstantData()
        const { wp } = useWorkspacePath()

        // Wait a tick for InstantDB subscription to pick up the new app
        await new Promise((r) => setTimeout(r, 500))

        const newApp = applications.value.find((a) => a.id === worldId)
        if (newApp) {
          currentApp.value = newApp
          await nextTick()
          await navigateTo(wp('/workspace/welcome'))
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Installation failed'
      result.error = error.value || undefined
      console.error('[template-installer] Error:', err)
    } finally {
      installing.value = false
    }

    return result
  }

  async function uninstallTemplate(
    templateId: string,
    _worldId?: string,
  ): Promise<boolean> {
    // TODO: Remove ontologies and sidebar nodes for this template
    console.warn('[template-installer] Uninstall not yet implemented for:', templateId)
    return false
  }

  return {
    installTemplate,
    uninstallTemplate,
    installing: computed(() => installing.value),
    error: computed(() => error.value),
    progress: computed(() => progress.value),
  }
}

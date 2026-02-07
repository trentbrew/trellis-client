<script setup lang="ts">
  import { ROLE_PERMISSIONS, ROLE_HIERARCHY, getPermissionDescription } from '~/lib/permissions'
  import type { UserRole, RolePermissions } from '~/config/routes'

  const db = useInstantDb()
  const tx = db.tx as any
  const { currentApp } = useInstantData()

  const SETTINGS_KEY = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `app:${appId}:roleConfigs` : ''
  })

  // Role display config stored in InstantDB settings
  interface RoleDisplayConfig {
    role: UserRole
    label: string
    icon: string
    description: string
    permissions: RolePermissions
  }

  const DEFAULT_CONFIGS: RoleDisplayConfig[] = ROLE_HIERARCHY.map((role) => ({
    role,
    label: role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1),
    icon:
      role === 'superadmin'
        ? 'lucide:shield'
        : role === 'admin'
          ? 'lucide:shield-check'
          : role === 'member'
            ? 'lucide:user'
            : 'lucide:eye',
    description: getPermissionDescription(role),
    permissions: { ...ROLE_PERMISSIONS[role] },
  }))

  const roleConfigs = ref<RoleDisplayConfig[]>(structuredClone(DEFAULT_CONFIGS))
  const isSaving = ref(false)
  const isLoading = ref(true)
  const editingRole = ref<UserRole | null>(null)

  // Load saved configs from InstantDB
  const loadConfigs = async () => {
    if (!SETTINGS_KEY.value) {
      isLoading.value = false
      return
    }
    try {
      const result = await db.queryOnce({
        settings: { $: { where: { settingKey: SETTINGS_KEY.value } } },
      })
      const saved = (result.data as any)?.settings?.[0]?.value
      if (Array.isArray(saved) && saved.length > 0) {
        // Merge saved configs with defaults (in case new roles were added)
        roleConfigs.value = DEFAULT_CONFIGS.map((def) => {
          const override = saved.find((s: any) => s.role === def.role)
          return override ? { ...def, ...override } : def
        })
      }
    } catch (e) {
      console.error('Failed to load role configs:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Save configs to InstantDB
  const saveConfigs = async () => {
    if (!SETTINGS_KEY.value) return
    isSaving.value = true
    try {
      const result = await db.queryOnce({
        settings: { $: { where: { settingKey: SETTINGS_KEY.value } } },
      })
      const existing = (result.data as any)?.settings?.[0]
      const id = existing?.id || crypto.randomUUID()
      const now = Date.now()

      await db.transact([
        tx.settings[id].update({
          settingKey: SETTINGS_KEY.value,
          entityType: 'app',
          entityId: currentApp.value?.id || '',
          key: 'roleConfigs',
          value: roleConfigs.value,
          updatedAt: now,
          ...(existing ? {} : { createdAt: now }),
        }),
      ])
    } catch (e) {
      console.error('Failed to save role configs:', e)
    } finally {
      isSaving.value = false
    }
  }

  const resetToDefaults = () => {
    roleConfigs.value = structuredClone(DEFAULT_CONFIGS)
    editingRole.value = null
    saveConfigs()
  }

  const togglePermission = (role: UserRole, perm: keyof RolePermissions) => {
    const config = roleConfigs.value.find((c) => c.role === role)
    if (!config) return
    // Superadmin permissions are immutable
    if (role === 'superadmin') return
    config.permissions[perm] = !config.permissions[perm]
    // Enforce hierarchy: admin implies write, write implies read
    if (perm === 'admin' && config.permissions.admin) {
      config.permissions.write = true
      config.permissions.read = true
    }
    if (perm === 'write' && config.permissions.write) {
      config.permissions.read = true
    }
    if (perm === 'read' && !config.permissions.read) {
      config.permissions.write = false
      config.permissions.admin = false
    }
    if (perm === 'write' && !config.permissions.write) {
      config.permissions.admin = false
    }
    saveConfigs()
  }

  watch(SETTINGS_KEY, () => loadConfigs(), { immediate: true })
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Roles & Permissions"
    description="Manage workspace roles, display names, and permission levels."
    icon="lucide:shield">
    <div class="space-y-6">
      <!-- Roles Table -->
      <UiCard>
        <UiCardHeader class="flex flex-row items-center justify-between">
          <div>
            <UiCardTitle>Workspace Roles</UiCardTitle>
            <UiCardDescription>
              Customize role names and permissions. Changes apply to this workspace.
            </UiCardDescription>
          </div>
          <UiButton variant="ghost" size="sm" @click="resetToDefaults">
            <Icon name="lucide:rotate-ccw" class="mr-2 h-4 w-4" />
            Reset Defaults
          </UiButton>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="isLoading" class="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          <div v-else class="space-y-3">
            <div
              v-for="config in [...roleConfigs].reverse()"
              :key="config.role"
              class="border border-border rounded-xl p-4 transition-colors"
              :class="editingRole === config.role ? 'bg-muted/30 ring-1 ring-primary/20' : ''">
              <div class="flex items-start gap-4">
                <!-- Role Icon -->
                <div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg mt-0.5">
                  <Icon :name="config.icon" class="text-primary size-5" />
                </div>

                <!-- Role Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <!-- Inline editable label -->
                    <template v-if="editingRole === config.role">
                      <input
                        v-model="config.label"
                        class="text-sm font-semibold bg-transparent border-b border-primary outline-none w-40"
                        @blur="editingRole = null; saveConfigs()"
                        @keydown.enter="editingRole = null; saveConfigs()" />
                    </template>
                    <template v-else>
                      <span class="text-sm font-semibold">{{ config.label }}</span>
                      <button
                        v-if="config.role !== 'superadmin'"
                        class="text-muted-foreground hover:text-foreground transition-colors"
                        @click="editingRole = config.role">
                        <Icon name="lucide:pencil" class="h-3 w-3" />
                      </button>
                    </template>

                    <span class="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      {{ config.role }}
                    </span>
                  </div>

                  <!-- Editable description -->
                  <template v-if="editingRole === config.role">
                    <input
                      v-model="config.description"
                      class="text-xs text-muted-foreground bg-transparent border-b border-border outline-none w-full mt-1"
                      placeholder="Role description..."
                      @blur="saveConfigs()"
                      @keydown.enter="editingRole = null; saveConfigs()" />
                  </template>
                  <template v-else>
                    <p class="text-xs text-muted-foreground">{{ config.description }}</p>
                  </template>
                </div>

                <!-- Permission Toggles -->
                <div class="flex items-center gap-3 shrink-0">
                  <div
                    v-for="perm in (['read', 'write', 'admin'] as const)"
                    :key="perm"
                    class="flex flex-col items-center gap-1.5">
                    <span class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {{ perm }}
                    </span>
                    <button
                      class="size-7 rounded-md border flex items-center justify-center transition-all"
                      :class="
                        config.permissions[perm]
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      "
                      :disabled="config.role === 'superadmin'"
                      @click="togglePermission(config.role, perm)">
                      <Icon
                        :name="config.permissions[perm] ? 'lucide:check' : 'lucide:minus'"
                        class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Info Card -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>How Roles Work</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-3 text-sm text-muted-foreground">
            <div class="flex items-start gap-3">
              <Icon name="lucide:arrow-up-right" class="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>Roles follow a hierarchy — higher roles inherit all permissions from lower roles.</p>
            </div>
            <div class="flex items-start gap-3">
              <Icon name="lucide:pencil" class="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>Click the pencil icon next to a role name to rename it. The internal key stays the same.</p>
            </div>
            <div class="flex items-start gap-3">
              <Icon name="lucide:shield" class="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>Super Admin permissions cannot be modified — they always have full access.</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>

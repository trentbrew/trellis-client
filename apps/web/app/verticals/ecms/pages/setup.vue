<script setup lang="ts">
  import seedData from '~/data/ecmsSeedData.json'

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Facility Setup | ${currentFacility.value?.name || 'Facility'}`,
  }))

  type RoleType = 'environmentalManagers' | 'safetyManagers' | 'generalManagers' | 'normal'

  type RoleRow = {
    id: string
    type: RoleType
    name: string
  }

  const facilitySeedIdBySlug: Record<string, string> = {
    auburn: 'facility_bst_0001',
    bellingham: 'facility_tml_0002',
    chandler: 'facility_mpr_0003',
    houston: 'facility_bst_0001',
    'charlotte-steel': 'facility_tml_0002',
    berkeley: 'facility_mpr_0003',
    'denver-processing': 'facility_bst_0001',
  }

  const facilitySeedId = computed(() => {
    const slug = currentFacility.value?.slug
    if (!slug) return seedData.facilities[0]?.facilityID || null
    return facilitySeedIdBySlug[slug] || seedData.facilities[0]?.facilityID || null
  })

  const seededRoles = computed<RoleRow[]>(() => {
    const id = facilitySeedId.value
    if (!id) return []
    return (seedData.roles || [])
      .filter((r: any) => r.facilityID === id)
      .map((r: any) => ({
        id: r.roleID,
        type: r.type as RoleType,
        name: r.type === 'generalManagers' ? 'General Manager' : r.name,
      }))
  })

  const roles = computed<RoleRow[]>(() => seededRoles.value)

  const missingRoles = computed(() => {
    const hasEnvironmentalManagers = roles.value.some((r) => r.type === 'environmentalManagers')
    const hasSafetyManagers = roles.value.some((r) => r.type === 'safetyManagers')
    const hasGeneralManagers = roles.value.some((r) => r.type === 'generalManagers')

    return {
      environmentalManagers: !hasEnvironmentalManagers,
      safetyManagers: !hasSafetyManagers,
      generalManagers: !hasGeneralManagers,
    }
  })

  const roleTypeLabels: Record<RoleType, string> = {
    environmentalManagers: 'Facility Environmental Manager',
    safetyManagers: 'Facility Safety Manager',
    generalManagers: 'General Manager',
    normal: 'Custom Role',
  }

  const roleTypeDescriptions: Partial<Record<RoleType, string>> = {
    environmentalManagers:
      'Environmental managers are notified about incomplete tracked tasks 3 days before they are due. Additionally, an Environmental Manager is necessary for BOLCC and Permit Suggested Tasks to be automatically scheduled.',
    generalManagers: 'General managers are notified about incomplete tracked tasks on the day they are due.',
  }

  const missingRoleLabels = computed(() => {
    const labels: string[] = []
    if (missingRoles.value.environmentalManagers) labels.push(roleTypeLabels.environmentalManagers)
    if (missingRoles.value.safetyManagers) labels.push(roleTypeLabels.safetyManagers)
    if (missingRoles.value.generalManagers) labels.push(roleTypeLabels.generalManagers)
    return labels
  })

  const facilityConfigClean = reactive({ timeZone: '' })
  const facilityConfig = reactive({ timeZone: '' })

  const dirty = computed(() => facilityConfig.timeZone !== facilityConfigClean.timeZone)
  const isConfigValid = computed(() => !!facilityConfig.timeZone)

  const timeZoneOptions = computed(() => {
    const supported = (Intl as any).supportedValuesOf?.('timeZone') as string[] | undefined
    if (Array.isArray(supported) && supported.length) return supported

    return ['America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles']
  })

  watch(
    facilitySeedId,
    (newId) => {
      const facility = (seedData.facilities || []).find((f: any) => f.facilityID === newId)
      const timeZone = facility?.timeZone || ''
      facilityConfigClean.timeZone = timeZone
      facilityConfig.timeZone = timeZone
    },
    { immediate: true },
  )

  function facilityConfigCancel() {
    facilityConfig.timeZone = facilityConfigClean.timeZone
  }

  function facilityConfigSave() {
    facilityConfigClean.timeZone = facilityConfig.timeZone
  }

  const rolePlaceholder = 'Managed in Admin Console'
</script>

<template>
  <Page
    variant="settings"
    title="Facility Setup"
    :subtitle="currentOrganization?.name"
    description="Configure facility roles and configuration."
    icon="lucide:building-2"
    icon-class="text-slate-300"
    :fill-height="true">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <div>
        <h2 class="text-lg font-semibold mb-4">Roles</h2>

        <UiCard class="mb-4">
          <UiCardContent class="p-6 space-y-1">
            <UiLabel class="font-semibold">Corporate Environmental Manager</UiLabel>
            <p class="text-sm text-muted-foreground">{{ rolePlaceholder }}</p>
            <p class="text-sm text-muted-foreground">
              The corporate environmental manager is notified about incomplete tracked tasks 1 day after they are due.
            </p>
          </UiCardContent>
        </UiCard>

        <UiCard class="mb-4">
          <UiCardContent class="p-0">
            <div class="divide-y divide-border">
              <div v-for="role in roles" :key="role.id" class="flex items-center justify-between p-4">
                <div class="min-w-0">
                  <p class="font-medium truncate">{{ roleTypeLabels[role.type] }}</p>
                  <p class="text-sm text-muted-foreground truncate">{{ role.name || rolePlaceholder }}</p>
                  <p v-if="roleTypeDescriptions[role.type]" class="text-xs text-muted-foreground mt-1">
                    {{ roleTypeDescriptions[role.type] }}
                  </p>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <div class="rounded-lg border border-border bg-muted/10 p-4 space-y-2">
          <p class="text-sm font-medium">Roles are managed in the Admin Console.</p>
          <p class="text-sm text-muted-foreground">
            Use the admin console to add people or update role assignments for this facility.
          </p>
          <div
            v-if="missingRoles.environmentalManagers"
            class="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <Icon name="lucide:info" class="h-4 w-4 mt-0.5 shrink-0" />
            <p class="text-sm">
              Until a Facility Environmental Manager is configured, Permit and BOLCC Suggested Tasks will not be
              automatically scheduled.
            </p>
          </div>
          <div
            v-if="missingRoleLabels.length"
            class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <Icon name="lucide:alert-triangle" class="h-4 w-4 mt-0.5 shrink-0" />
            <p class="text-sm">Missing roles: {{ missingRoleLabels.join(', ') }}.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold mb-4">Facility Configuration</h2>
        <UiCard>
          <UiCardContent class="p-6 space-y-4">
            <div>
              <UiLabel class="font-semibold">Facility Time zone</UiLabel>
              <UiSelect v-model="facilityConfig.timeZone">
                <UiSelectTrigger class="mt-1.5">
                  <UiSelectValue placeholder="Select time zone" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem v-for="tz in timeZoneOptions" :key="tz" :value="tz">{{ tz }}</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>

            <div v-if="dirty" class="flex items-center justify-end gap-2">
              <UiButton variant="outline" :disabled="!isConfigValid" @click="facilityConfigCancel()">Cancel</UiButton>
              <UiButton :disabled="!isConfigValid" @click="facilityConfigSave()">
                <Icon name="lucide:save" class="mr-2 h-4 w-4" />
                Save
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>

        <UiCard class="mt-4">
          <UiCardContent class="p-6 space-y-2">
            <UiLabel class="font-semibold">External Integrations</UiLabel>
            <p class="text-sm text-muted-foreground">
              Configure external systems to create tasks automatically via API endpoints.
            </p>
            <UiButton variant="outline" disabled>
              <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
              Create External Integration
            </UiButton>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>

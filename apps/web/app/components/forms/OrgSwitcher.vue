<script lang="ts" setup>
  import type { Organization } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { organizations, currentOrg } = useInstantData()

  const getPlanLabel = (plan: unknown) => {
    const safe = typeof plan === 'string' && plan ? plan : 'free'
    return safe.charAt(0).toUpperCase() + safe.slice(1) + ' plan'
  }

  const getColorClass = (index: number) => {
    const colors = ['bg-primary text-primary-foreground', 'bg-sky-500 text-white', 'bg-emerald-500 text-white']
    return colors[index % colors.length]
  }

  // Organizations are now reactive - auto-updates from InstantDB
  watch(
    organizations,
    (orgs) => {
      if (orgs.length > 0 && !currentOrg.value) {
        currentOrg.value = orgs[0]!
      }
    },
    { immediate: true },
  )

  const selectOrg = (org: Organization) => {
    currentOrg.value = org
    const nextQuery = { ...route.query } as Record<string, any>
    delete nextQuery.app
    void router.replace({
      query: {
        ...nextQuery,
        org: org.slug,
      },
    })
  }
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <button class="hover:bg-accent/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition">
        <!-- <div
          class="bg-foreground/10 text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
        >
          <Icon v-if="currentOrg?.avatar" :name="currentOrg.avatar" class="h-3 w-3" />
          <Icon v-else name="lucide:building" class="h-5 w-5 text-foreground" />
        </div> -->
        <Icon name="lucide:boxes" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span class="text-foreground text-xs font-medium">{{ currentOrg?.name || 'Select Org' }}</span>
        <Icon name="lucide:chevrons-up-down" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      </button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="start" :side-offset="8" class="w-[232px]">
      <UiDropdownMenuLabel>Organizations</UiDropdownMenuLabel>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem v-for="(org, i) in organizations" :key="org.id" class="gap-3" @click="selectOrg(org)">
        <div
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
          :class="getColorClass(i)">
          <Icon v-if="org.avatar" :name="org.avatar" class="h-3 w-3" />
          <Icon v-else name="lucide:building" class="h-3 w-3" />
        </div>
        <div class="flex flex-1 flex-col">
          <span class="truncate">{{ org.name }}</span>
          <span class="text-muted-foreground text-xs">{{ getPlanLabel(org.plan) }}</span>
        </div>
        <Icon v-if="org.id === currentOrg?.id" name="lucide:check" class="text-primary h-4 w-4 shrink-0" />
      </UiDropdownMenuItem>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem icon="lucide:plus">Create organization</UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>

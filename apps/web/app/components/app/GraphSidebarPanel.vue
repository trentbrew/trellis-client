<script setup lang="ts">
  const route = useRoute()

  const navLinks = [
    { to: '/graph/dashboard', icon: 'lucide:gauge', label: 'Dashboard' },
    { to: '/graph/explorer', icon: 'lucide:search', label: 'Explorer' },
    { to: '/graph/visualization', icon: 'lucide:network', label: 'Visualization' },
    { to: '/graph/query', icon: 'lucide:terminal', label: 'Query' },
    { to: '/graph/ontology', icon: 'lucide:blocks', label: 'Ontology' },
    { to: '/graph/activity', icon: 'lucide:scroll-text', label: 'Activity' },
  ]
</script>

<template>
  <nav class="px-2.5 pt-3 space-y-0.5">
    <AppNavLink
      v-for="link in navLinks"
      :key="link.to"
      :to="link.to"
      class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors"
      :class="
        route.path === link.to
          ? 'bg-foreground/5 text-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-foreground/5'
      ">
      <Icon :name="link.icon" class="h-4 w-4 shrink-0 opacity-60" />
      <span>{{ link.label }}</span>
    </AppNavLink>
  </nav>
</template>

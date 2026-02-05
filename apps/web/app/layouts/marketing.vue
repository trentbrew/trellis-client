<script setup lang="ts">
  const route = useRoute()
</script>

<template>
  <div class="bg-background text-foreground min-h-dvh flex flex-col">
    <header class="border-b border-border/60">
      <UiContainer constrained class="flex h-16 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <Icon name="lucide:shapes" class="h-5 w-5" />
          <span>Platform Sandbox</span>
        </NuxtLink>

        <nav class="flex items-center gap-2">
          <UiButton variant="ghost" to="/auth/login" :class="{ 'text-foreground': route.path === '/auth/login' }">
            Sign in
          </UiButton>
          <UiButton to="/auth/signup" :class="{ 'text-foreground': route.path === '/auth/signup' }">
            Sign up
          </UiButton>
        </nav>
      </UiContainer>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border/60">
      <UiContainer constrained class="py-10">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-muted-foreground">© {{ new Date().getFullYear() }} Platform Sandbox</div>
          <div class="flex items-center gap-4 text-sm">
            <NuxtLink to="/auth/login" class="text-muted-foreground hover:text-foreground transition">Sign in</NuxtLink>
            <NuxtLink to="/auth/signup" class="text-muted-foreground hover:text-foreground transition">
              Sign up
            </NuxtLink>
          </div>
        </div>
      </UiContainer>
    </footer>
  </div>
</template>

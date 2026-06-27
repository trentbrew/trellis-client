<script setup lang="ts"></script>

<template>
  <div class="bg-background text-foreground min-h-dvh flex flex-col">
    <header class="border-b border-border/60 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
      <UiContainer constrained class="flex h-16 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-3 font-semibold group">
          <AppLogo size="28" class="transition-transform group-hover:scale-110" />
          <span class="text-lg">Trellis</span>
        </NuxtLink>

        <nav class="flex items-center gap-1">
          <UiButton variant="ghost" size="sm" href="https://github.com/trentbrew" target="_blank" rel="noopener">
            <Icon name="lucide:github" class="h-4 w-4" />
            <span class="hidden sm:inline">GitHub</span>
          </UiButton>
          <UiButton variant="ghost" size="sm" to="/welcome">
            <Icon name="lucide:rocket" class="h-4 w-4" />
            <span class="hidden sm:inline">Try it</span>
          </UiButton>
        </nav>
      </UiContainer>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border/60 bg-muted/30">
      <UiContainer constrained class="py-12">
        <div class="flex flex-col gap-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div class="flex items-center gap-3">
              <AppLogo size="32" />
              <div>
                <div class="font-semibold">Trellis</div>
                <div class="text-xs text-muted-foreground">Personal Knowledge Graph</div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-6 text-sm">
              <a
                href="https://github.com/trentbrew"
                target="_blank"
                rel="noopener"
                class="text-muted-foreground hover:text-foreground transition-colors">
                GitHub
              </a>
              <NuxtLink to="/welcome" class="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </NuxtLink>
              <a
                href="https://github.com/trentbrew"
                target="_blank"
                rel="noopener"
                class="text-muted-foreground hover:text-foreground transition-colors">
                Community
              </a>
            </div>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-border/60">
            <div class="text-xs text-muted-foreground">
              © {{ new Date().getFullYear() }} Trellis. Built with ❤️ by
              <a
                href="https://github.com/trentbrew"
                target="_blank"
                rel="noopener"
                class="text-primary hover:underline">
                @trentbrew
              </a>
            </div>
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Open Source</span>
              <span>•</span>
              <span>Local-First</span>
              <span>•</span>
              <span>Privacy-Focused</span>
            </div>
          </div>
        </div>
      </UiContainer>
    </footer>
  </div>
</template>

<template>
  <div class="onboarding-layout bg-background text-foreground min-h-dvh overflow-hidden">
    <div class="onboarding-bg" aria-hidden="true" />
    <slot />
  </div>
</template>

<style scoped>
.onboarding-layout {
  position: relative;
}

.onboarding-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, hsl(var(--primary) / 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 90%, hsl(262 80% 60% / 0.05) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 70%);
  animation: bg-drift 20s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes bg-drift {
  0%   { opacity: 0.6; transform: scale(1) translate(0, 0); }
  33%  { opacity: 1;   transform: scale(1.04) translate(1%, -1%); }
  66%  { opacity: 0.8; transform: scale(0.98) translate(-1%, 1%); }
  100% { opacity: 1;   transform: scale(1.02) translate(0.5%, 0.5%); }
}
</style>

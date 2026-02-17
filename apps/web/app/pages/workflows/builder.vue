<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })

  // The workflow builder is now embedded in /workflows/[id].
  // Redirect to the workflows list.
  const router = useRouter()
  onMounted(() => {
    router.replace('/workflows')
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <UiLoader />
  </div>
</template>

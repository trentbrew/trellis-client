<script setup lang="ts">
  const { wp } = useWorkspacePath()
  await navigateTo(wp('/settings/project'), { replace: true })
</script>

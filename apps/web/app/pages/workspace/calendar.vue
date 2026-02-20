<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  // Calendar has been promoted to a top-level route.
  // Redirect any bookmarks/links that still point here, preserving the org prefix.
  const { wp } = useWorkspacePath()
  navigateTo(wp('/calendar'), { replace: true })
</script>

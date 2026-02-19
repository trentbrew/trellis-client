<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  // Calendar has been promoted to a top-level route.
  // Redirect any bookmarks/links that still point here.
  navigateTo('/calendar', { redirectCode: 301, replace: true })
</script>

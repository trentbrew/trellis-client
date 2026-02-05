<script lang="ts">
  import GanttProvider from './GanttProvider.vue'
  import GanttTimeline from './GanttTimeline.vue'
  import GanttHeader from './GanttHeader.vue'
  import GanttSidebar from './GanttSidebar.vue'
  import GanttSidebarItem from './GanttSidebarItem.vue'
  import GanttSidebarGroup from './GanttSidebarGroup.vue'
  import GanttFeatureList from './GanttFeatureList.vue'
  import GanttFeatureListGroup from './GanttFeatureListGroup.vue'
  import GanttFeatureItem from './GanttFeatureItem.vue'
  import GanttMarker from './GanttMarker.vue'
  import GanttToday from './GanttToday.vue'
  import GanttCreateMarkerTrigger from './GanttCreateMarkerTrigger.vue'
  import GanttToolbar from './GanttToolbar.vue'
  import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ContextMenu.vue'

  export {
    GanttProvider,
    GanttTimeline,
    GanttHeader,
    GanttSidebar,
    GanttSidebarItem,
    GanttSidebarGroup,
    GanttFeatureList,
    GanttFeatureListGroup,
    GanttFeatureItem,
    GanttMarker,
    GanttToday,
    GanttCreateMarkerTrigger,
    GanttToolbar,
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
  }

  export default {
    GanttProvider,
    GanttTimeline,
    GanttHeader,
    GanttSidebar,
    GanttSidebarItem,
    GanttSidebarGroup,
    GanttFeatureList,
    GanttFeatureListGroup,
    GanttFeatureItem,
    GanttMarker,
    GanttToday,
    GanttCreateMarkerTrigger,
    GanttToolbar,
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
  }
</script>

<template>
  <slot />
</template>

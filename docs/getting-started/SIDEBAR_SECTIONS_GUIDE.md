# Dynamic Sidebar Sections Guide

## Overview

You can now define multiple collapsible sidebar sections directly in your route configuration (`routes.ts`). This allows you to organize sidebar navigation into custom sections like "PINNED", "RECENT", "FAVORITES", etc.

## Configuration

### 1. Add `sidebarSections` to your route config

In `app/config/routes.ts`, add the `sidebarSections` property to any route:

```typescript
{
  path: '/station',
  label: 'Station',
  icon: 'lucide:radio-tower',
  // ... other route properties
  sidebarSections: [
    {
      label: 'PINNED',
      key: 'station-pinned',
      collapsible: true,
      defaultCollapsed: false,
      order: 0,
      items: () => {
        // Return array of RouteConfig items
        const pinned = usePinnedItems()
        return pinned.getPinnedItems(/* your items */)
      }
    },
    {
      label: 'STATION',
      key: 'station-main',
      collapsible: true,
      editable: true, // Shows "Add New" button
      order: 1,
      items: [
        // Static array of RouteConfig items
        {
          path: '/station/channels',
          label: 'Channels',
          icon: 'lucide:tv',
        },
        // ... more items
      ]
    }
  ]
}
```

### 2. Section Properties

| Property           | Type                                     | Description                                      |
| ------------------ | ---------------------------------------- | ------------------------------------------------ |
| `label`            | `string`                                 | Section heading (e.g., "PINNED", "RECENT")       |
| `key`              | `string`                                 | Unique key for collapse state persistence        |
| `items`            | `RouteConfig[]` or `() => RouteConfig[]` | Items to display (static array or function)      |
| `collapsible`      | `boolean`                                | Whether section can be collapsed (default: true) |
| `defaultCollapsed` | `boolean`                                | Initial collapsed state                          |
| `editable`         | `boolean`                                | Show "Add New" button                            |
| `order`            | `number`                                 | Sort order (lower = appears first)               |

### 3. Dynamic Items

You can use functions to provide dynamic items:

```typescript
items: () => {
  const { collections } = useInstantData();
  return collections.value.map((col) => ({
    path: `/collections/${col.slug}`,
    label: col.title,
    icon: col.icon || 'lucide:database',
  }));
};
```

## Example: Station Route with Multiple Sections

```typescript
{
  path: '/station',
  label: 'Station',
  icon: 'lucide:radio-tower',
  inRail: true,
  sidebarSections: [
    // Pinned items section
    {
      label: 'PINNED',
      key: 'station-pinned',
      collapsible: true,
      order: 0,
      items: () => {
        const pinned = usePinnedItems()
        const routes = useRoutes()
        return pinned.getPinnedItems(routes.currentSectionLinks.value)
      }
    },

    // Main station items
    {
      label: 'STATION',
      key: 'station-main',
      collapsible: true,
      editable: true,
      order: 1,
      items: () => {
        const pinned = usePinnedItems()
        const routes = useRoutes()
        return pinned.getUnpinnedItems(routes.currentSectionLinks.value)
      }
    },

    // Recent items (example)
    {
      label: 'RECENT',
      key: 'station-recent',
      collapsible: true,
      defaultCollapsed: true,
      order: 2,
      items: () => {
        // Return recently accessed items
        return []
      }
    }
  ],
  children: [
    // Your existing children routes
  ]
}
```

## Features

- **Automatic rendering**: Sections are automatically rendered in `AppSidebar.vue`
- **Pin/Unpin support**: Items can be pinned/unpinned with the pin icon
- **Collapse state**: Section collapse state is persisted via `useCollapsedSections()`
- **Context menu**: Collection items get rename/delete/export options
- **Animations**: Smooth expand/collapse animations via motion-v
- **Fallback**: If no `sidebarSections` defined, falls back to legacy PINNED + current section

## Migration

Existing routes without `sidebarSections` will continue to work with the legacy behavior (PINNED section + current section items).

To migrate, add `sidebarSections` to your route config and organize your sidebar items into logical sections.

# Centralized Route Configuration Architecture

## Overview

This document outlines the architecture and implications of using a centralized route configuration system.

## Current State

Currently, navigation is defined in multiple places:

- `app/layouts/default.vue` - Contains `railLinks`, `railSecondary`, and `navSections`
- Individual page files - Each page defines its own metadata
- Command palette - Manually populated in the layout

## Proposed Architecture

A single `app/config/routes.ts` file that defines all routes hierarchically, driving:

- Rail navigation (left icon rail)
- Sidebar navigation (collapsible sections)
- Command palette search (cmd+k)
- Breadcrumb generation
- Page metadata (title, description, SEO)
- Empty states and placeholders

## Benefits

### ✅ Single Source of Truth

- All route definitions in one place
- Easier to maintain and update
- No duplication across components

### ✅ Type Safety

- TypeScript interfaces ensure consistency
- Compile-time checks for route structure
- Better IDE autocomplete

### ✅ Automatic Generation

- Navigation components generated from config
- Breadcrumbs computed automatically
- Command palette populated automatically

### ✅ Consistency

- Uniform metadata structure
- Consistent navigation patterns
- Easier to enforce design system

### ✅ Scalability

- Easy to add new routes
- Hierarchical organization supports growth
- Can handle complex nested structures

### ✅ Features

- Dynamic badges (functions that return values)
- Visibility controls (permissions, feature flags)
- Search keywords for better command palette
- Order control for navigation items

## Drawbacks & Considerations

### ⚠️ Synchronization

- **Issue**: Route config must stay in sync with actual page files
- **Mitigation**:
  - Use TypeScript to catch path mismatches
  - Consider build-time validation
  - Document the relationship clearly

### ⚠️ File Size

- **Issue**: Large route trees might make the config file unwieldy
- **Mitigation**:
  - Split into multiple files by domain
  - Use hierarchical organization
  - Consider lazy loading for very large apps

### ⚠️ Dynamic Routes

- **Issue**: Routes with parameters (e.g., `/forms/:id`) need special handling
- **Mitigation**:
  - Use path patterns instead of exact paths
  - Handle dynamic segments in utility functions
  - Consider route groups for dynamic routes

### ⚠️ Learning Curve

- **Issue**: New developers need to understand the config structure
- **Mitigation**:
  - Clear documentation
  - TypeScript interfaces provide guidance
  - Examples and comments in config file

### ⚠️ Flexibility

- **Issue**: Some pages might need custom navigation logic
- **Mitigation**:
  - Allow `visible` functions for conditional display
  - Support custom slots in generated components
  - Don't force all routes into the config

## Implementation Strategy

### Phase 1: Core Structure

1. Create `app/config/routes.ts` with TypeScript interfaces
2. Migrate existing routes to the config
3. Create utility functions for route access

### Phase 2: Integration

1. Update layout to use route config
2. Update command palette to use route config
3. Update breadcrumb generation

### Phase 3: Enhancement

1. Add dynamic badges
2. Add visibility controls
3. Add search keywords
4. Add route metadata integration

### Phase 4: Validation

1. Add build-time route validation
2. Add runtime checks for missing routes
3. Add TypeScript strict checks

## Usage Examples

### Basic Route Definition

```typescript
{
  path: "/forms/new",
  label: "Create form",
  icon: "lucide:square-plus",
  tint: "text-sky-300",
  inCommandPalette: true,
  meta: {
    title: "Create form",
    description: "Build your form with our drag-and-drop editor.",
    subtitle: "Forms",
    subtitleColor: "text-sky-300",
  },
}
```

### Route with Dynamic Badge

```typescript
{
  path: "/activity/responses",
  label: "Responses",
  icon: "lucide:inbox",
  badge: () => getUnreadCount(), // Function that returns dynamic value
  inCommandPalette: true,
}
```

### Route with Visibility Control

```typescript
{
  path: "/admin/users",
  label: "User Management",
  icon: "lucide:users",
  requiresAuth: true,
  visible: () => hasAdminAccess(),
  inCommandPalette: true,
}
```

## Migration Path

1. **Start with new routes**: Add new routes to the config
2. **Gradually migrate**: Move existing routes one section at a time
3. **Keep both systems**: Run both in parallel during migration
4. **Remove old code**: Once all routes are migrated, remove old definitions

## Alternative Approaches

### Option 1: File-based Route Discovery

- Scan `app/pages/` directory
- Extract metadata from page files
- Generate navigation automatically
- **Pros**: Always in sync, no manual config
- **Cons**: Less flexible, harder to customize

### Option 2: Hybrid Approach

- Core routes in config
- Dynamic routes discovered from files
- Merge both sources
- **Pros**: Best of both worlds
- **Cons**: More complex, two sources of truth

### Option 3: Route Registry Pattern

- Routes register themselves
- Each page file exports route config
- Central registry collects all routes
- **Pros**: Routes live with pages
- **Cons**: Still distributed, harder to see full picture

## Recommendation

**Start with the centralized config approach** because:

1. Your app has a clear, hierarchical structure
2. Navigation is relatively stable
3. You want consistency across the app
4. Type safety is valuable
5. You can always evolve to a hybrid approach later

## Next Steps

1. Review and refine the route config structure
2. Create utility functions for route access
3. Update layout component to use config
4. Migrate existing routes gradually
5. Add validation and tooling

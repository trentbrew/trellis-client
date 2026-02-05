# Unified App Config (JSON-LD)

**Status:** Initial scaffold (theme presets wired into runtime)

This document describes the unified JSON-LD configuration added in `app/config/app-config.jsonld`, along with the loader/resolvers in `app/lib/appConfig.ts`.

## Purpose

Create a single semantic configuration source for:

- Application manifest defaults
- Data sources + entity schemas
- Ontology type hierarchy
- Field definitions
- Projection renderer mappings
- Icon + component registries
- Routes and navigation metadata
- Theme presets

The JSON-LD format preserves linked-data semantics while keeping the config portable across environments.

## File Locations

- **Config:** `app/config/app-config.jsonld`
- **Loader/Resolvers:** `app/lib/appConfig.ts`
- **Raw module typing:** `app/types/raw.d.ts`

## Config Structure

`app-config.jsonld` has two top-level sections:

- `@context`: Prefix and property aliases
- `@graph`: All configuration nodes

### Key Node Types

| Node Type     | @type                                     | Purpose                                     |
| ------------- | ----------------------------------------- | ------------------------------------------- |
| Application   | `app:Application`                         | Default theme/projection + data source list |
| Data source   | `app:DataSource`                          | External system adapters                    |
| Data model    | `app:DataModel`                           | Entity schema list                          |
| Entity schema | `app:EntitySchema`                        | InstantDB collection shape                  |
| Types         | `rdfs:Class`                              | Ontology type hierarchy                     |
| Fields        | `app:Field`                               | Field definitions + UI components           |
| Projections   | `ui:Projection`                           | Projection -> component mappings            |
| Routes        | `app:Route`                               | Nav + permissions metadata                  |
| Themes        | `ui:Theme`                                | Theme presets                               |
| Registries    | `ui:ComponentRegistry`, `ui:IconRegistry` | Logical → implementation mapping            |

## Loader API (`app/lib/appConfig.ts`)

### Core

- `appConfig`: Parsed JSON-LD document
- `getAppConfigNodeById(id)`
- `getAppConfigNodesByType(type)`

### Registries

- `getComponentRegistry()`
- `getIconRegistry()`
- `resolveComponentPath(value)`
- `resolveIcon(value)`

### Projections

- `getProjectionNodes()`
- `getProjectionByType(type)`
- `resolveProjectionComponent(type)`
- `resolveProjectionIcon(type)`

### Types + Fields

- `getTypeNodes()`
- `resolveTypeComponent(typeId)`
- `resolveTypeIcon(typeId)`
- `getFieldNodes()`
- `resolveFieldIcon(fieldId)`

### Routes

- `getRouteNodes()`
- `buildRouteConfigFromNode(node)`
- `buildRouteConfigTree()`

### Themes

- `getThemePresetsFromConfig()` → `ThemePresets`
- `getDefaultThemePresetId()` → resolved preset id for `app:Application.defaultTheme`

## Example Usage

```ts
import {
  resolveProjectionIcon,
  resolveProjectionComponent,
  buildRouteConfigTree,
  getThemePresetsFromConfig,
} from '~/lib/appConfig';

const icon = resolveProjectionIcon('table');
const componentPath = resolveProjectionComponent('table');
const routes = buildRouteConfigTree();
const presets = getThemePresetsFromConfig();
```

## Integration Notes (Optional)

These integrations are now wired. Theme presets, routes, and projection icons all load from `app-config.jsonld`:

1. **Routes** → ✅ using `buildRouteConfigTree()` in `app/config/routes.ts`.
2. **Theme presets** → ✅ wired in `app/stores/theme.ts` (merged with `defaultPresets`).
3. **Projection icons** → ✅ using `resolveProjectionIcon()` in `app/lib/projections.ts`.

> ⚠️ **Architectural note:** `docs/notes/JSON_LD_ARCHITECTURE.md` currently treats app shell routing as code-driven. If we move routes into JSON-LD, we should update that document to reflect the new direction.

## Verification

You can sanity-check config parsing with:

```bash
npx vite-node --script scripts/verify-app-config.ts
```

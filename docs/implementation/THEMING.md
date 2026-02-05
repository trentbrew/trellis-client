# Dynamic Theming Engine

This app includes a comprehensive dynamic theming engine that allows users to select from many built-in theme presets or create their own custom themes.

## Features

- 🎨 **Multiple Built-in Presets**: Choose from a collection of carefully crafted theme presets
- ✨ **Custom Themes**: Create and save your own custom theme presets
- 🌓 **Dark/Light Mode Support**: All themes support both light and dark modes
- 💾 **Persistent Storage**: Theme preferences are saved to localStorage
- 🔄 **Real-time Preview**: See theme changes instantly as you apply them

## Architecture

### Core Components

1. **Type Definitions** (`app/types/theme.ts`)
   - `ThemePreset`: Defines the structure of a theme preset
   - `ThemeStyleProps`: All available theme properties
   - `ThemeStyles`: Light and dark mode styles

2. **Theme Store** (`app/stores/theme.ts`)
   - Pinia store managing theme state
   - Handles preset registration, updates, and deletion
   - Persists custom presets to localStorage

3. **Theme Composable** (`app/composables/useTheme.ts`)
   - Vue composable for easy theme management
   - Integrates with Nuxt's color-mode module
   - Provides reactive theme state

4. **Theme Utilities** (`app/utils/theme.ts`)
   - Functions to apply theme styles to CSS variables
   - Converts theme presets to CSS custom properties
   - Works with Tailwind CSS v4

5. **Theme Plugin** (`app/plugins/theme.client.ts`)
   - Initializes theme on app startup
   - Watches for theme and color mode changes
   - Automatically reapplies themes when needed

## Usage

### In Components

```vue
<script setup>
  import { useTheme } from '~/composables/useTheme';

  const { currentPreset, setPreset, allPresets } = useTheme();
</script>

<template>
  <div>
    <button @click="setPreset('modern-minimal')">
      Apply Modern Minimal Theme
    </button>
  </div>
</template>
```

### Using the Theme Selector Component

```vue
<template>
  <ThemeSelector
    label="Choose Theme"
    placeholder="Select a theme..."
    :show-reset="true"
  />
</template>
```

### Creating Custom Themes

```typescript
import { useTheme } from '~/composables/useTheme';

const { createPreset } = useTheme();

createPreset('my-custom-theme', {
  label: 'My Custom Theme',
  source: 'CUSTOM',
  styles: {
    light: {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#3b82f6',
      // ... other properties
    },
    dark: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#60a5fa',
      // ... other properties
    },
  },
});
```

## Theme Properties

A theme preset includes the following properties (all optional except where noted):

### Core Colors

- `background` - Main background color
- `foreground` - Main text color
- `card` - Card background color
- `card-foreground` - Card text color
- `popover` - Popover background color
- `popover-foreground` - Popover text color

### Semantic Colors

- `primary` - Primary brand color
- `primary-foreground` - Text on primary color
- `secondary` - Secondary color
- `secondary-foreground` - Text on secondary color
- `muted` - Muted background color
- `muted-foreground` - Muted text color
- `accent` - Accent color
- `accent-foreground` - Text on accent color
- `destructive` - Error/destructive color
- `destructive-foreground` - Text on destructive color

### UI Elements

- `border` - Border color
- `input` - Input field background
- `ring` - Focus ring color

### Charts

- `chart-1` through `chart-5` - Chart color palette

### Sidebar (optional)

- `sidebar` - Sidebar background
- `sidebar-foreground` - Sidebar text
- `sidebar-primary` - Sidebar primary color
- `sidebar-primary-foreground` - Text on sidebar primary
- `sidebar-accent` - Sidebar accent color
- `sidebar-accent-foreground` - Text on sidebar accent
- `sidebar-border` - Sidebar border color
- `sidebar-ring` - Sidebar focus ring color
- `sidebar-input` - Sidebar input background

### Typography (optional)

- `font-sans` - Sans-serif font family
- `font-serif` - Serif font family
- `font-mono` - Monospace font family

### Other (optional)

- `radius` - Border radius value
- `shadow-*` - Shadow properties
- `letter-spacing` - Letter spacing value
- `spacing` - Spacing value

## Adding More Presets

To add more built-in presets:

1. Edit `app/config/presets.ts`
2. Add your preset to the `defaultPresets` object:

```typescript
export const defaultPresets: ThemePresets = {
  'my-new-preset': {
    label: 'My New Preset',
    source: 'BUILT_IN',
    styles: {
      light: {
        /* ... */
      },
      dark: {
        /* ... */
      },
    },
  },
};
```

Alternatively, you can extract presets from `docs/PRESETS.md` using:

```bash
npx tsx scripts/extract-presets.ts
```

## Pages

- **Theme Settings**: `/settings/theme` - Full theme management interface
- **Project Settings**: `/settings/project` - Quick theme selector

## Integration with Tailwind CSS v4

The theming system works seamlessly with Tailwind CSS v4 by setting CSS custom properties on the document root. These variables are then used by Tailwind's theme system.

The CSS variables follow the naming convention: `--{property-name}` (e.g., `--background`, `--primary`, etc.)

## Storage

- **Current Preset**: Stored in `localStorage` as `theme-preset-id`
- **Color Mode**: Stored in `localStorage` as `theme-mode` (managed by `@nuxtjs/color-mode`)
- **Custom Presets**: Stored in `localStorage` as `theme-custom-presets`

## Future Enhancements

Potential improvements:

- Theme import/export (JSON)
- Theme sharing between users
- Advanced theme editor with color pickers
- Theme preview with live component examples
- Theme validation and contrast checking

# @toolkit/ui

<img width="1178" height="743" alt="image" src="https://github.com/user-attachments/assets/8d538088-343c-465c-aee6-378d1c7b83e3" />

Toolkit's internal Vue 3 component library built on [Reka UI](https://reka-ui.com/) and [Tailwind CSS v4](https://tailwindcss.com/).

## Features

- **90+ Components** - Comprehensive set of UI primitives and compound components
- **Accessible** - Built on Reka UI (headless, accessible components)
- **Themeable** - Single source of truth via TypeScript config with runtime CSS variable injection
- **TypeScript** - Full type safety throughout
- **Form Validation** - VeeValidate + Zod integration
- **Charts** - ApexCharts integration for data visualization
- **Data Tables** - TanStack Table and DataTables.net support

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
src/
├── components/
│   ├── Ui/              # Core UI components (Button, Input, Dialog, etc.)
│   ├── Layout/          # Layout components (Sidebar, Navbar, etc.)
│   └── ...              # Feature-specific components
├── composables/         # Vue composables (useTheme, useCarousel, etc.)
├── stores/              # Pinia stores (theme, brandProfile, etc.)
├── pages/               # Documentation & example pages
│   ├── components/      # Component showcase pages
│   ├── docs/            # Getting started documentation
│   └── examples/        # Full-page examples (dashboard, calendar, etc.)
├── config/              # Theme presets & app configuration
│   ├── theme.ts         # Default theme values (single source of truth)
│   ├── toolkitTheme.ts  # Toolkit brand preset
│   └── brandThemePresets.ts # All available theme presets
├── layouts/             # Page layouts
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Theming

The theme system uses a **single source of truth** architecture:

- **Config** (`src/config/theme.ts`) → Defines default CSS variable values
- **Presets** (`src/config/brandThemePresets.ts`) → Collection of theme presets
- **Runtime** (`src/utils/theme.ts`) → Injects CSS variables into DOM at runtime
- **No hardcoded values** in `tailwind.css` - only variable references

```typescript
// Apply a theme preset programmatically
import { useTheme } from '@/composables/useTheme';

const { themeStore, toggleTheme } = useTheme();
themeStore.applyThemePreset('toolkit');
```

## Available Scripts

| Script          | Description                         |
| --------------- | ----------------------------------- |
| `pnpm dev`      | Start development server            |
| `pnpm build`    | Build for production                |
| `pnpm preview`  | Preview production build            |
| `pnpm test`     | Run tests with Vitest               |
| `pnpm lint`     | Lint with ESLint                    |
| `pnpm lint:fix` | Auto-fix lint issues                |
| `pnpm format`   | Format with Prettier                |
| `pnpm ui:add`   | Add new components via ui-thing CLI |

## Component Categories

### Form Inputs

Button, Input, Textarea, Checkbox, Switch, Slider, Select, DatePicker, TagsInput, Rating, Autocomplete, CurrencyInput, PinInput, NumberField

### Data Display

Badge, Chip, Avatar, Card, Table, TanStackTable, DataTable, Tree, Timeline, Kbd, Calendar

### Feedback

Alert, AlertDialog, Skeleton, Progress, Loader, Tooltip, Sonner (toast)

### Navigation

Tabs, Accordion, Stepper, Breadcrumbs, Command, Collapsible, NavigationMenu, Pagination, Sidebar

### Overlays

Dialog, Popover, Sheet, Drawer, DropdownMenu, ContextMenu, HoverCard

### Layout

Separator, Divider, Container, AspectRatio, Splitter, ScrollArea

### Charts

Line Chart, Area Chart, Bar Chart, Donut Chart (via ApexCharts)

## Tech Stack

- **Framework**: Vue 3.5+ with Composition API
- **Build**: Vite (with Rolldown-Vite for faster builds)
- **Styling**: Tailwind CSS v4
- **Components**: Reka UI (headless primitives)
- **State**: Pinia
- **Forms**: VeeValidate + Zod
- **Tables**: TanStack Table, DataTables.net
- **Charts**: ApexCharts
- **Icons**: Lucide Vue, Iconify
- **Testing**: Vitest + Vue Test Utils

## Adding Components

Use the ui-thing CLI to add new components:

```bash
pnpm ui:add <component-name>
```

See [ui-thing documentation](https://ui-thing.behonbaker.com/) for available components.

## Documentation

- **Component Docs Guide**: See [COMPONENT_DOCS_GUIDE.md](./COMPONENT_DOCS_GUIDE.md) for documenting components
- **Rolldown Info**: See [ROLLDOWN.md](./ROLLDOWN.md) for build tool details

## Requirements

- Node.js >= 20
- pnpm (recommended) or npm

## License

MIT - See [LICENSE.md](./LICENSE.md)

/**
 * Background image mapping system for page headers
 * Maps different page types and routes to appropriate background images
 */

export interface BackgroundImageConfig {
  url: string
  overlayOpacity?: number
  overlayColor?: string
  position?: string
  size?: string
}

// Background image mappings for different page types/sections
const backgroundMappings: Record<string, BackgroundImageConfig> = {
  // Collections pages - industrial/facility themes
  collections: {
    url: '/assets/backgrounds/industrial-facility.png',
    overlayOpacity: 0.7,
    overlayColor: 'rgb(30, 58, 138)', // blue-800
    position: 'center',
    size: 'cover',
  },

  // Dashboard/overview pages - power plant theme
  dashboard: {
    url: '/assets/backgrounds/power-plant.png',
    overlayOpacity: 0.6,
    overlayColor: 'rgb(30, 41, 59)', // slate-800
    position: 'center',
    size: 'cover',
  },

  // Settings/admin pages - clean factory theme
  settings: {
    url: '/assets/backgrounds/chemical-plant.png',
    overlayOpacity: 0.7,
    overlayColor: 'rgb(30, 41, 59)', // slate-800
    position: 'center',
    size: 'cover',
  },

  // Browse/listing pages - mining theme
  browse: {
    url: '/assets/backgrounds/mining.png',
    overlayOpacity: 0.6,
    overlayColor: 'rgb(30, 58, 138)', // blue-800
    position: 'center',
    size: 'cover',
  },

  // Workflow/process pages - crane theme
  workflows: {
    url: '/assets/backgrounds/crane-signal.png',
    overlayOpacity: 0.6,
    overlayColor: 'rgb(30, 41, 59)', // slate-800
    position: 'center',
    size: 'cover',
  },

  // Default fallback - factory by river
  default: {
    url: '/assets/backgrounds/factory-by-river.png',
    overlayOpacity: 0.6,
    overlayColor: 'rgb(30, 58, 138)', // blue-800
    position: 'center',
    size: 'cover',
  },
}

// Route-based mappings
const routeMappings: Record<string, keyof typeof backgroundMappings> = {
  '/collections': 'collections',
  '/dashboard': 'dashboard',
  '/home': 'dashboard',
  '/settings': 'settings',
  '/workflows': 'workflows',
  '/browse': 'browse',
}

export function useBackgroundImages() {
  const route = useRoute()

  /**
   * Get background image config for current route
   */
  const getBackgroundConfig = (path?: string): BackgroundImageConfig => {
    const currentPath = path || route.path

    // Find matching route mapping
    for (const [routePattern, mapping] of Object.entries(routeMappings)) {
      if (currentPath.startsWith(routePattern)) {
        return backgroundMappings[mapping] ?? backgroundMappings.default!
      }
    }

    // Return default if no match found
    return backgroundMappings.default!
  }

  /**
   * Get CSS styles for background image
   */
  const getBackgroundStyles = (config?: BackgroundImageConfig): Record<string, string> => {
    const bgConfig = config || getBackgroundConfig()

    return {
      backgroundImage: `linear-gradient(to bottom, ${bgConfig.overlayColor || 'rgb(30, 58, 138)'} ${bgConfig.overlayOpacity || 0.6}, ${bgConfig.overlayColor || 'rgb(30, 58, 138)'} ${bgConfig.overlayOpacity || 0.6}), url('${bgConfig.url}')`,
      backgroundPosition: bgConfig.position || 'center',
      backgroundSize: bgConfig.size || 'cover',
      backgroundRepeat: 'no-repeat',
    }
  }

  /**
   * Get all available background images
   */
  const getAvailableBackgrounds = () => {
    return Object.keys(backgroundMappings)
  }

  /**
   * Update background mapping (for dynamic customization)
   */
  const updateBackgroundMapping = (key: string, config: BackgroundImageConfig) => {
    backgroundMappings[key] = config
  }

  return {
    getBackgroundConfig,
    getBackgroundStyles,
    getAvailableBackgrounds,
    updateBackgroundMapping,
  }
}

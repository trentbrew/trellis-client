import { resolve } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'

// Load .env from monorepo root (two levels up from apps/web/)
// Nuxt only auto-loads .env from the project root (apps/web/), so we
// manually inject monorepo-root env vars that aren't already set.
const monoEnvPath = resolve(__dirname, '../../.env')
if (existsSync(monoEnvPath)) {
  const lines = readFileSync(monoEnvPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

const DEFAULT_DEV_PORT = 1414
const parsedDevPort = Number.parseInt(process.env.TRELLIS_PORT || '', 10)
const PREFERRED_PORT = Number.isFinite(parsedDevPort) ? parsedDevPort : DEFAULT_DEV_PORT
const DEV_PORT = PREFERRED_PORT

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app/',
  devtools: { enabled: false },
  devServer: { port: DEV_PORT, host: '127.0.0.1' },

  components: [
    {
      path: '~/components/Ui',
      prefix: 'Ui',
      pathPrefix: true,
      extensions: ['vue'],
    },
    {
      path: '~/components',
      pathPrefix: false,
      extensions: ['vue'],
      ignore: ['Ui/**', '**/*.test.vue', '**/*.spec.vue'],
    },
  ],

  experimental: {
    appManifest: false,
  },

  ssr: false,

  runtimeConfig: {
    trellisSidecar: process.env.TRELLIS_SIDECAR === '1',
    trellisVcsRoot: process.env.TRELLIS_VCS_ROOT ?? '',
    trellisUrl: process.env.TRELLIS_URL ?? 'http://localhost:8230',
    trellisApiKey: process.env.TRELLIS_API_KEY ?? '',
    public: {
      dataMode: 'local' as const,
      trellisPort: DEV_PORT,
      trellisSidecar: process.env.TRELLIS_SIDECAR === '1',
      trellisWsUrl: process.env.TRELLIS_URL ?? 'http://localhost:8230',
      trellisApiKey: process.env.TRELLIS_API_KEY ?? '',
    },
  },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    'motion-v/nuxt',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxt/test-utils/module',
    '@yuta-inoue-ph/nuxt-vcalendar',
    '@vee-validate/nuxt',
    'vue-sonner/nuxt',
  ],

  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
        },
      },
    },
  },

  imports: {
    imports: [
      { from: 'tailwind-variants', name: 'tv' },
      { from: 'tailwind-variants', name: 'VariantProps', type: true },
      {
        from: 'vue-sonner',
        name: 'toast',
        as: 'useSonner',
      },
    ],
  },

  colorMode: { classSuffix: '', storageKey: 'trellis-color-mode', preference: 'dark' },

  icon: {
    clientBundle: { scan: true, sizeLimitKb: 0 },
    mode: 'svg',
    class: 'shrink-0',
    fetchTimeout: 2000,
    serverBundle: false, // Disable server bundle for serverless compatibility
  },

  nitro: {
    ignore: ['**/*.test.*', '**/*.spec.*'],
    preset: 'node-server',
    externals: {
      inline: [/^@turtle\.tech\//],
    },
  },

  css: [
    '~/assets/css/tailwind.css',
    '~/assets/css/table-node.scss',
    'katex/dist/katex.min.css',
    '@vue-flow/core/dist/style.css',
    '@vue-flow/core/dist/theme-default.css',
    '@vue-flow/controls/dist/style.css',
    '@vue-flow/minimap/dist/style.css',
  ],

  vite: {
    plugins: [
      tailwindcss(),
      // Treat .jsonld files as JSON imports (Vite only handles .json natively)
      {
        name: 'jsonld-loader',
        transform(code: string, id: string) {
          if (id.endsWith('.jsonld')) {
            return { code: `export default ${code}`, map: null }
          }
        },
      },
    ] as any,
    optimizeDeps: {
      include: ['mermaid', 'vue-sonner', 'lucide-vue-next', 'dayjs', '@tiptap/vue-3', '@tiptap/core', '@vueuse/core'],
    },
    resolve: {
      dedupe: ['vue-sonner'],
    },
    server: {
      hmr: { overlay: false, port: 24678 },
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      },
    },
  },

  app: {
    head: {
      titleTemplate: '%s | Trellis',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css?family=Material+Icons',
        },
      ],
      script: [
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/pdfmake.min.js',
          defer: true,
        },
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/vfs_fonts.min.js',
          defer: true,
        },
      ],
    },
  },

  routeRules: {
    '/settings': { redirect: '/settings/profile' },
  },
})

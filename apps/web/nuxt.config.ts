import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app/',
  devtools: { enabled: true },
  devServer: { port: 4141, host: '127.0.0.1' },

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
      ignore: ['Ui/**'],
    },
  ],

  experimental: {
    appManifest: false,
  },

  ssr: false,

  runtimeConfig: {
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
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

  colorMode: { classSuffix: '', storageKey: 'platform-sandbox-color-mode', preference: 'light' },

  icon: {
    clientBundle: { scan: true, sizeLimitKb: 0 },
    mode: 'svg',
    class: 'shrink-0',
    fetchTimeout: 2000,
    serverBundle: false, // Disable server bundle for serverless compatibility
  },

  nitro: {
    preset: 'static',
  },

  css: [
    '~/assets/css/tailwind.css',
    '@vue-flow/core/dist/style.css',
    '@vue-flow/core/dist/theme-default.css',
    '@vue-flow/controls/dist/style.css',
    '@vue-flow/minimap/dist/style.css',
  ],

  vite: {
    plugins: [tailwindcss()] as any,
  },

  app: {
    head: {
      titleTemplate: '%s | Platform Sandbox',
      link: [
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
    '/settings': { redirect: '/settings/project' },
  },
})

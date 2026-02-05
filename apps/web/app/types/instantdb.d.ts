declare module '#app' {
  interface NuxtApp {
    $instantDb: any
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $instantDb: any
  }
}

export {}

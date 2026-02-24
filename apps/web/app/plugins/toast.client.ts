import { toast } from 'vue-sonner'

export default defineNuxtPlugin((nuxtApp) => {
  // Prevent duplicate injection if another plugin/module already provides $toast.
  if ((nuxtApp as any).$toast) return

  nuxtApp.provide('toast', {
    success: (title: string, options?: any) => toast.success(title, options),
    error: (title: string, options?: any) => toast.error(title, options),
    info: (title: string, options?: any) => toast.info(title, options),
    warning: (title: string, options?: any) => toast.warning(title, options),
    message: (title: string, options?: any) => toast.message(title, options),
    // Default method uses info type
    default: (title: string, options?: any) => toast.info(title, options),
  })
})

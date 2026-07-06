/**
 * Single TipTap editor lease for sheet cells — one instance, mount/unmount per focus.
 */
import { ref, readonly, type Ref } from 'vue'

export type EditorLeaseCommitHandler = (cellKey: string, html: string) => void | Promise<void>

export interface EditorLease {
  cellKey: Readonly<Ref<string | null>>
  mountTarget: Readonly<Ref<HTMLElement | null>>
  pendingHtml: Readonly<Ref<string>>
  acquire: (cellKey: string, mountEl: HTMLElement | null, initialHtml?: string) => Promise<void>
  release: () => Promise<void>
  commit: () => Promise<void>
  setContent: (html: string) => void
  isActive: (cellKey: string) => boolean
}

export function createEditorLease(onCommit: EditorLeaseCommitHandler): EditorLease {
  const cellKey = ref<string | null>(null)
  const mountTarget = ref<HTMLElement | null>(null)
  const pendingHtml = ref('')

  async function commit(): Promise<void> {
    const key = cellKey.value
    if (!key) return
    await onCommit(key, pendingHtml.value)
  }

  async function release(): Promise<void> {
    await commit()
    cellKey.value = null
    mountTarget.value = null
    pendingHtml.value = ''
  }

  async function acquire(key: string, mountEl: HTMLElement | null, initialHtml = ''): Promise<void> {
    if (cellKey.value && cellKey.value !== key) {
      await commit()
    }
    cellKey.value = key
    mountTarget.value = mountEl
    pendingHtml.value = initialHtml
  }

  function setContent(html: string): void {
    pendingHtml.value = html
  }

  function isActive(key: string): boolean {
    return cellKey.value === key
  }

  return {
    cellKey: readonly(cellKey),
    mountTarget: readonly(mountTarget),
    pendingHtml: readonly(pendingHtml),
    acquire,
    release,
    commit,
    setContent,
    isActive,
  }
}

/** Vue composable wrapper — one lease per component tree */
export function useEditorLease(onCommit: EditorLeaseCommitHandler): EditorLease {
  return createEditorLease(onCommit)
}

import { describe, it, expect, vi } from 'vitest'
import { createEditorLease } from './useEditorLease'
import { makeSheetCellKey } from '~/lib/sheet-cell-key'

describe('useEditorLease', () => {
  it('acquires and releases a cell lease', async () => {
    const onCommit = vi.fn()
    const lease = createEditorLease(onCommit)
    const el = document.createElement('div')
    const key = makeSheetCellKey('entity:expense-e2b', 'vendor')

    await lease.acquire(key, el, '<p>Hello</p>')
    expect(lease.cellKey.value).toBe(key)
    expect(lease.mountTarget.value).toBe(el)
    expect(lease.isActive(key)).toBe(true)

    lease.setContent('<p>Updated</p>')
    await lease.release()

    expect(onCommit).toHaveBeenCalledWith(key, '<p>Updated</p>')
    expect(lease.cellKey.value).toBeNull()
    expect(lease.mountTarget.value).toBeNull()
  })

  it('commits previous cell when acquiring a new one', async () => {
    const onCommit = vi.fn()
    const lease = createEditorLease(onCommit)
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const keyA = makeSheetCellKey('entity:a', 'col1')
    const keyB = makeSheetCellKey('entity:b', 'col1')

    await lease.acquire(keyA, el1, 'first')
    await lease.acquire(keyB, el2, 'second')

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(keyA, 'first')
    expect(lease.cellKey.value).toBe(keyB)
  })

  it('awaits delayed commit before switching cells', async () => {
    let resolveCommit: (() => void) | undefined
    const onCommit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCommit = resolve
        }),
    )
    const lease = createEditorLease(onCommit)
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const keyA = makeSheetCellKey('entity:a', 'col1')
    const keyB = makeSheetCellKey('entity:b', 'col1')

    await lease.acquire(keyA, el1, 'first')

    const secondAcquire = lease.acquire(keyB, el2, 'second')
    await Promise.resolve()

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(lease.cellKey.value).toBe(keyA)

    resolveCommit?.()
    await secondAcquire

    expect(lease.cellKey.value).toBe(keyB)
  })

  it('commit is no-op when no active lease', async () => {
    const onCommit = vi.fn()
    const lease = createEditorLease(onCommit)
    await lease.commit()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

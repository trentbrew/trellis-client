import type { ChecklistItem } from '~/types/entity'

/**
 * Convert a flat ChecklistItem[] (with parentId nesting) into TipTap-compatible
 * TaskList HTML. Used to migrate legacy checklist arrays to the new
 * `checklistContent` HTML string field.
 */
export function checklistItemsToHtml(items: ChecklistItem[]): string {
  if (!items || items.length === 0) return ''

  // Sort by order
  const sorted = [...items].sort((a, b) => a.order - b.order)

  // Group children by parentId
  const childrenMap = new Map<string | null, ChecklistItem[]>()
  for (const item of sorted) {
    const key = item.parentId ?? null
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(item)
  }

  function renderItems(parentId: string | null): string {
    const children = childrenMap.get(parentId)
    if (!children || children.length === 0) return ''

    const lis = children.map((ci) => {
      const checked = ci.completed ? 'true' : 'false'
      const label = escapeHtml(ci.label || '')
      const nested = renderItems(ci.id)
      return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${ci.completed ? ' checked="checked"' : ''}><span></span></label><div><p>${label}</p>${nested}</div></li>`
    })

    return `<ul data-type="taskList">${lis.join('')}</ul>`
  }

  return renderItems(null)
}

/**
 * Count checked / total task items from TaskList HTML content.
 * Returns { checked, total }.
 */
export function countChecklistProgress(html: string): { checked: number; total: number } {
  if (!html) return { checked: 0, total: 0 }

  const totalMatches = html.match(/data-type="taskItem"/g)
  const checkedMatches = html.match(/data-checked="true"/g)

  return {
    checked: checkedMatches?.length ?? 0,
    total: totalMatches?.length ?? 0,
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

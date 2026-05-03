function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeEntityId(id: string): string {
  return id.trim().replace(/^entity:/, '')
}

function renderMention(entityId: string, label: string): string {
  const id = normalizeEntityId(entityId)
  const text = label.trim() || id
  return `<span data-type="mention" data-id="${escapeHtml(id)}" data-label="${escapeHtml(text)}" class="mention-chip agent-entity-mention" role="button" tabindex="0">@${escapeHtml(text)}</span>`
}

export function renderAgentEntityReferences(content: string): string {
  if (!content) return ''

  return content
    .replace(/@\[([^\]\n]+)\]\((entity:[^)\s]+)\)/g, (_match, label, entityId) => renderMention(entityId, label))
    .replace(/\[\[\s*(entity:[^|\]\s]+)\s*\|\s*([^\]\n]+?)\s*\]\]/g, (_match, entityId, label) => renderMention(entityId, label))
    .replace(/\[\[\s*(entity:[^\]\s]+)\s*\]\]/g, (_match, entityId) => renderMention(entityId, entityId))
}

import { factsToNode } from './app-config-facts'

/** When EAV stores repeated updates, factsToNode yields arrays — take the latest. */
export function resolveLatestFactValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value[value.length - 1]

  return value
}

function setNestedValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = root

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    const next = current[part]
    if (typeof next !== 'object' || next === null || Array.isArray(next))
      current[part] = {}

    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]!] = value
}

/** Reconstruct a nested object from dotted EAV keys (e.g. value.presetId → { presetId }). */
export function unflattenPrefixed(
  node: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  const dotPrefix = `${prefix}.`

  for (const [attr, raw] of Object.entries(node)) {
    if (attr === '@id' || attr === '@type' || attr === 'type')
      continue

    if (!attr.startsWith(dotPrefix))
      continue

    const path = attr.slice(dotPrefix.length)
    setNestedValue(root, path, resolveLatestFactValue(raw))
  }

  return root
}

/** Read the `value` field from a platform setting node (handles dotted EAV storage). */
export function readPlatformSettingValue(node: Record<string, unknown>): unknown {
  const fromDotted = unflattenPrefixed(node, 'value')
  if (Object.keys(fromDotted).length > 0)
    return fromDotted

  if (!('value' in node))
    return null

  return resolveLatestFactValue(node.value)
}

export function readPlatformSettingFromFacts(
  entityId: string,
  facts: Array<{ e: string; a: string; v: unknown }>,
): unknown {
  if (facts.length === 0)
    return null

  const node = factsToNode(entityId, facts)
  return readPlatformSettingValue(node)
}

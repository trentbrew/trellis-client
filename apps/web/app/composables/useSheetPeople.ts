import { useTrellisGraph } from '~/composables/useTrellisGraph'

const PERSON_QUERY =
  'FIND entity AS ?p WHERE ?p.type = "person" RETURN ?p, ?p.title LIMIT 20'

export function useSheetPeople() {
  const { query, fetchNode } = useTrellisGraph()
  const { data: peopleRows } = query(PERSON_QUERY)

  const people = computed(() =>
    (peopleRows.value || [])
      .map((row) => {
        const id = String(row['?p'] ?? row.entityId ?? '')
        const title = String(row['?p.title'] ?? row.title ?? id)
        return { id, title }
      })
      .filter((p) => p.id),
  )

  async function resolvePersonTitle(id: string | null | undefined): Promise<string> {
    if (!id) return '—'
    const cached = people.value.find((p) => p.id === id)
    if (cached) return cached.title
    try {
      const { node } = await fetchNode(id)
      const data = node?.data ?? node ?? {}
      return (data.title as string) || id
    } catch {
      return id
    }
  }

  return { people, resolvePersonTitle }
}

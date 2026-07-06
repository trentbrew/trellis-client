/** Infer row entity type from sheet EQL-S query (TRL-319). */
export function inferEntityTypeFromEqls(query: string): string | null {
  const m =
    query.match(/\?e\.type\s*=\s*"([^"]+)"/i) ?? query.match(/\?e\.type\s*=\s*'([^']+)'/i)
  return m?.[1] ?? null
}

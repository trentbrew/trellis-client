/** Cell key encoding — entity ids contain colons; use pipe delimiter */
export const SHEET_CELL_KEY_SEP = '|'

export function makeSheetCellKey(entityId: string, columnId: string): string {
  return `${entityId}${SHEET_CELL_KEY_SEP}${columnId}`
}

export function parseSheetCellKey(key: string): { entityId: string; columnId: string } | null {
  const sep = key.indexOf(SHEET_CELL_KEY_SEP)
  if (sep < 0) return null
  return {
    entityId: key.slice(0, sep),
    columnId: key.slice(sep + SHEET_CELL_KEY_SEP.length),
  }
}

/** Strip this. prefix for useCollectionFormulas eval */
export function normalizeSheetFormula(formula: string): string {
  return formula.replace(/\bthis\./g, '')
}

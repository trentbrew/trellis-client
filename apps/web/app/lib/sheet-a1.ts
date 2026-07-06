/** A1 notation helpers for sheet projections */

import { normalizeSheetFormula } from '~/lib/sheet-cell-key'

export function columnIndexToLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function columnLetterToIndex(letter: string): number {
  const u = letter.toUpperCase()
  let n = 0
  for (let i = 0; i < u.length; i++) {
    n = n * 26 + (u.charCodeAt(i) - 64)
  }
  return n - 1
}

export interface A1Range {
  startCol: number
  startRow: number
  endCol: number
  endRow: number
}

/** Parse A1 range like `A2:E6` (1-based rows in notation, 0-based internally) */
export function parseA1Range(range: string): A1Range | null {
  const m = range.trim().match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/)
  if (!m) return null
  return {
    startCol: columnLetterToIndex(m[1]!),
    startRow: parseInt(m[2]!, 10) - 1,
    endCol: columnLetterToIndex(m[3]!),
    endRow: parseInt(m[4]!, 10) - 1,
  }
}

export function toA1Ref(rowIndex: number, colIndex: number): string {
  return `${columnIndexToLetter(colIndex)}${rowIndex + 1}`
}

/** Display A1 formula from semantic refs for a row (e.g. budgeted - spent → C8-D8) */
export function semanticFormulaToA1(
  expression: string,
  rowIndex: number,
  columns: Array<{ id: string; attribute: string }>,
): string {
  let out = normalizeSheetFormula(expression.trim())
  if (!out.startsWith('=')) out = `=${out}`
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci]!
    const attr = col.attribute
    const a1 = toA1Ref(rowIndex, ci)
    out = out.replace(new RegExp(`this\\.${attr}\\b`, 'g'), a1)
    out = out.replace(new RegExp(`\\b${attr}\\b`, 'g'), a1)
  }
  return out
}

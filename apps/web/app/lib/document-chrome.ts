/** Shared layout + type guards for note/page document chrome (document-chrome wedge). */

export const DOCUMENT_CHROME_TYPES = ['note', 'page'] as const

export type DocumentChromeType = (typeof DOCUMENT_CHROME_TYPES)[number]

export function isDocumentChromeType(type?: string): type is DocumentChromeType {
  return DOCUMENT_CHROME_TYPES.includes(type as DocumentChromeType)
}

/** Unified reading column — title + body share width and horizontal inset. */
export const DOC_COLUMN_NARROW_CLASS = 'w-full min-w-0 max-w-[720px] mx-auto px-8'

/** Full-width document column (no max-width cap). */
export const DOC_COLUMN_FULL_CLASS = 'w-full min-w-0 px-8'

/** @deprecated Use docColumnClass() or DOC_COLUMN_NARROW_CLASS */
export const DOC_COLUMN_CLASS = DOC_COLUMN_NARROW_CLASS

export function docColumnClass(fullWidth: boolean): string {
  return fullWidth ? DOC_COLUMN_FULL_CLASS : DOC_COLUMN_NARROW_CLASS
}

/** Normative title field typography (matches editor H1 scale). Multi-line via textarea. */
export const DOC_TITLE_CLASS =
  'block w-full m-0 min-h-0 p-0 bg-transparent border-0 outline-none resize-none overflow-hidden field-sizing-content text-3xl font-bold tracking-tight leading-[1.15] placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 rounded-sm hover:border-0 hover:bg-transparent break-words whitespace-pre-wrap'

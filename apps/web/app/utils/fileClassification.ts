/**
 * File Classification — derives fileCategory, fileExtension, and display
 * metadata from MIME types and filenames.
 *
 * Used by FileContent (upload flow), EntityCard (preview), and the
 * future Gemini enrichment pipeline to dispatch per-category prompts.
 */

// ── File category enum ─────────────────────────────────────────────────

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'archive'
  | 'font'
  | 'model'   // 3D models
  | 'data'    // JSON, XML, CSV, etc.
  | 'other'

// ── MIME → Category mapping ────────────────────────────────────────────

const MIME_PREFIX_MAP: [string, FileCategory][] = [
  ['image/', 'image'],
  ['video/', 'video'],
  ['audio/', 'audio'],
  ['font/', 'font'],
  ['model/', 'model'],
]

const MIME_CONTAINS_MAP: [string, FileCategory][] = [
  // Documents
  ['pdf', 'document'],
  ['msword', 'document'],
  ['wordprocessingml', 'document'],
  ['opendocument.text', 'document'],
  ['rtf', 'document'],
  ['epub', 'document'],

  // Spreadsheets
  ['spreadsheet', 'spreadsheet'],
  ['excel', 'spreadsheet'],
  ['csv', 'data'],

  // Presentations
  ['presentation', 'presentation'],
  ['powerpoint', 'presentation'],
  ['slide', 'presentation'],

  // Code / Data
  ['javascript', 'code'],
  ['typescript', 'code'],
  ['python', 'code'],
  ['java', 'code'],
  ['ruby', 'code'],
  ['rust', 'code'],
  ['golang', 'code'],
  ['x-c', 'code'],
  ['x-shellscript', 'code'],
  ['x-httpd-php', 'code'],

  // Data formats
  ['json', 'data'],
  ['xml', 'data'],
  ['yaml', 'data'],
  ['toml', 'data'],
  ['sql', 'data'],

  // Archives
  ['zip', 'archive'],
  ['tar', 'archive'],
  ['gzip', 'archive'],
  ['rar', 'archive'],
  ['7z', 'archive'],
  ['bzip', 'archive'],
  ['x-compress', 'archive'],
]

/** Extension → category fallback (for when mimeType is generic or missing) */
const EXTENSION_CATEGORY_MAP: Record<string, FileCategory> = {
  // Images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
  svg: 'image', bmp: 'image', ico: 'image', tiff: 'image', avif: 'image',
  heic: 'image', heif: 'image',

  // Video
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  flv: 'video', wmv: 'video', m4v: 'video', ogv: 'video',

  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio',
  m4a: 'audio', wma: 'audio', opus: 'audio', aiff: 'audio',

  // Documents
  pdf: 'document', doc: 'document', docx: 'document', odt: 'document',
  rtf: 'document', tex: 'document', epub: 'document', pages: 'document',

  // Spreadsheets
  xls: 'spreadsheet', xlsx: 'spreadsheet', ods: 'spreadsheet',
  numbers: 'spreadsheet',

  // Presentations
  ppt: 'presentation', pptx: 'presentation', odp: 'presentation',
  key: 'presentation',

  // Code
  js: 'code', ts: 'code', jsx: 'code', tsx: 'code', py: 'code',
  rb: 'code', rs: 'code', go: 'code', java: 'code', kt: 'code',
  swift: 'code', c: 'code', cpp: 'code', h: 'code', cs: 'code',
  php: 'code', sh: 'code', bash: 'code', zsh: 'code', fish: 'code',
  vue: 'code', svelte: 'code', html: 'code', css: 'code', scss: 'code',
  less: 'code', lua: 'code', r: 'code', m: 'code', zig: 'code',
  wasm: 'code', dart: 'code', ex: 'code', exs: 'code', erl: 'code',
  hs: 'code', clj: 'code', lisp: 'code', scala: 'code', ml: 'code',

  // Data
  json: 'data', xml: 'data', yaml: 'data', yml: 'data', toml: 'data',
  csv: 'data', tsv: 'data', sql: 'data', graphql: 'data', gql: 'data',
  proto: 'data', env: 'data', ini: 'data', conf: 'data',

  // Archives
  zip: 'archive', tar: 'archive', gz: 'archive', bz2: 'archive',
  '7z': 'archive', rar: 'archive', xz: 'archive', dmg: 'archive',

  // Fonts
  ttf: 'font', otf: 'font', woff: 'font', woff2: 'font', eot: 'font',

  // 3D
  obj: 'model', stl: 'model', fbx: 'model', gltf: 'model', glb: 'model',
  usdz: 'model',

  // Markdown / text
  md: 'document', txt: 'document', log: 'data',
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Extract file extension from a filename.
 * Returns lowercase extension without the dot, or empty string.
 */
export function getFileExtension(filename: string): string {
  if (!filename) return ''
  const idx = filename.lastIndexOf('.')
  if (idx < 1) return '' // no dot, or dot is the first char (hidden file)
  return filename.slice(idx + 1).toLowerCase()
}

/**
 * Classify a file into a category using MIME type and optional filename fallback.
 */
export function classifyFile(mimeType?: string, filename?: string): FileCategory {
  const mime = (mimeType || '').toLowerCase()

  // 1. Try MIME prefix match (image/*, video/*, audio/*, etc.)
  for (const [prefix, category] of MIME_PREFIX_MAP) {
    if (mime.startsWith(prefix)) return category
  }

  // 2. Try MIME substring match (pdf, spreadsheet, zip, etc.)
  for (const [substr, category] of MIME_CONTAINS_MAP) {
    if (mime.includes(substr)) return category
  }

  // 3. If MIME is generic (text/plain, application/octet-stream), fall back to extension
  if (filename) {
    const ext = getFileExtension(filename)
    if (ext && EXTENSION_CATEGORY_MAP[ext]) return EXTENSION_CATEGORY_MAP[ext]!
  }

  // 4. text/* types that didn't match above → document
  if (mime.startsWith('text/')) return 'document'

  return 'other'
}

// ── Display metadata per category ───────────────────────────────────────

export interface FileCategoryMeta {
  label: string
  icon: string
  color: string
}

export const FILE_CATEGORY_META: Record<FileCategory, FileCategoryMeta> = {
  image:        { label: 'Image',        icon: 'lucide:image',            color: 'purple' },
  video:        { label: 'Video',        icon: 'lucide:video',            color: 'blue' },
  audio:        { label: 'Audio',        icon: 'lucide:music',            color: 'pink' },
  document:     { label: 'Document',     icon: 'lucide:file-text',        color: 'red' },
  spreadsheet:  { label: 'Spreadsheet',  icon: 'lucide:file-spreadsheet', color: 'green' },
  presentation: { label: 'Presentation', icon: 'lucide:presentation',     color: 'orange' },
  code:         { label: 'Code',         icon: 'lucide:file-code',        color: 'emerald' },
  archive:      { label: 'Archive',      icon: 'lucide:archive',          color: 'amber' },
  font:         { label: 'Font',         icon: 'lucide:type',             color: 'slate' },
  model:        { label: '3D Model',     icon: 'lucide:box',              color: 'violet' },
  data:         { label: 'Data',         icon: 'lucide:braces',           color: 'teal' },
  other:        { label: 'File',         icon: 'lucide:file',             color: 'gray' },
}

/**
 * Get display metadata for a file category.
 */
export function getFileCategoryMeta(category: FileCategory): FileCategoryMeta {
  return FILE_CATEGORY_META[category] ?? FILE_CATEGORY_META.other
}

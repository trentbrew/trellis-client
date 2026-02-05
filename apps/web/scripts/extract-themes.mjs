import fs from 'fs'
import path from 'path'

const inputPath = '/Users/trentbrew/tk/apps/ecms-redesign/v1/theme-presets.ts'
const outputDir = '/Users/trentbrew/tk/apps/ecms-redesign/v1/app/config/themes'

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const content = fs.readFileSync(inputPath, 'utf8')

// Use a simple regex-based parser to find top-level objects in defaultPresets
const startMatch = content.indexOf('export const defaultPresets: ThemePresets = {')
if (startMatch === -1) {
  console.error('Could not find defaultPresets export')
  process.exit(1)
}

const presetsContent = content.substring(startMatch + 'export const defaultPresets: ThemePresets = {'.length)

// Extract individual themes
// We'll look for lines that start with 2 spaces followed by a key
const lines = presetsContent.split('\n')
const themes = {}
let currentThemeName = null
let currentThemeLines = []
let braceLevel = 0

for (let line of lines) {
  const trimmed = line.trim()

  // Detect theme start
  const themeMatch = line.match(/^ {2}['"]?([a-z0-9-]+)['"]?: \{/)
  if (themeMatch && braceLevel === 0) {
    currentThemeName = themeMatch[1]
    currentThemeLines = [line]
    braceLevel = 1
    continue
  }

  if (currentThemeName) {
    currentThemeLines.push(line)

    // Update brace level
    for (let char of line) {
      if (char === '{') braceLevel++
      if (char === '}') braceLevel--
    }

    if (braceLevel === 0) {
      // Theme finished
      themes[currentThemeName] = currentThemeLines.join('\n')
      currentThemeName = null
      currentThemeLines = []
    }
  }
}

// Special fix for 'tri' if it was parsed incorrectly due to the known issue
if (themes['tri']) {
  // If 'tri' is missing a brace, add it
  let triContent = themes['tri']
  let bLevel = 0
  for (let char of triContent) {
    if (char === '{') bLevel++
    if (char === '}') bLevel--
  }
  if (bLevel > 0) {
    while (bLevel > 0) {
      triContent += '\n  },'
      bLevel--
    }
    themes['tri'] = triContent
  }
}

const exportNames = []

for (const [id, themeContent] of Object.entries(themes)) {
  const camelId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  const fileName = `${id}.ts`
  const filePath = path.join(outputDir, fileName)

  const fileContent = `import type { ThemePreset } from '~/types/theme'

export const ${camelId}: ThemePreset = ${themeContent.trim().replace(/,$/, '')}
`

  fs.writeFileSync(filePath, fileContent)
  exportNames.push({ id, camelId })
}

// Generate new theme-presets.ts
const imports = exportNames.map((t) => `import { ${t.camelId} } from './app/config/themes/${t.id}'`).join('\n')
const presets = exportNames.map((t) => `  '${t.id}': ${t.camelId},`).join('\n')

const newPresetsFile = `import type { ThemePresets } from '~/types/theme'
${imports}

export const defaultPresets: ThemePresets = {
${presets}
}
`

fs.writeFileSync(inputPath, newPresetsFile)

console.log(`Successfully extracted ${exportNames.length} themes.`)

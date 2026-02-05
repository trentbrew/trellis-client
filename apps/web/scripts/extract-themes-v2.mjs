import fs from 'fs'
import path from 'path'

const inputPath = '/Users/trentbrew/tk/apps/ecms-redesign/v1/theme-presets.ts'
const outputDir = '/Users/trentbrew/tk/apps/ecms-redesign/v1/app/config/themes'

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Read the entire file content
const content = fs.readFileSync(inputPath, 'utf8')

// Find the start of the defaultPresets object
const startMarker = 'export const defaultPresets: ThemePresets = {'
const startIndex = content.indexOf(startMarker)
if (startIndex === -1) {
  console.error('Could not find defaultPresets export')
  process.exit(1)
}

// Find the content inside the curly braces of defaultPresets
let braceLevel = 0
let presetsStartIndex = startIndex + startMarker.length
let presetsEndIndex = -1

for (let i = presetsStartIndex - 1; i < content.length; i++) {
  if (content[i] === '{') braceLevel++
  if (content[i] === '}') {
    braceLevel--
    if (braceLevel === 0) {
      presetsEndIndex = i
      break
    }
  }
}

if (presetsEndIndex === -1) {
  console.error('Could not find end of defaultPresets object')
  process.exit(1)
}

const presetsContent = content.substring(presetsStartIndex, presetsEndIndex)

// Function to extract themes using brace counting
const extractThemes = (text) => {
  const themes = {}
  let i = 0
  while (i < text.length) {
    // Look for a theme key: 'name': { or name: {
    const match = text.substring(i).match(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/)
    if (match) {
      const themeId = match[1]
      const start = i + match.index
      let level = 0
      let end = -1

      for (let j = start + match[0].length - 1; j < text.length; j++) {
        if (text[j] === '{') level++
        if (text[j] === '}') {
          level--
          if (level === 0) {
            end = j + 1
            break
          }
        }
      }

      if (end !== -1) {
        themes[themeId] = text.substring(start + match[0].indexOf('{'), end)
        i = end
        continue
      }
    }
    i++
  }
  return themes
}

const extractedThemes = extractThemes(presetsContent)
const exportNames = []

for (const [id, themeBody] of Object.entries(extractedThemes)) {
  const camelId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  const fileName = `${id}.ts`
  const filePath = path.join(outputDir, fileName)

  // Format the file content
  const fileContent = `import type { ThemePreset } from '~/types/theme'

export const ${camelId}: ThemePreset = ${themeBody.trim()}
`

  fs.writeFileSync(filePath, fileContent)
  exportNames.push({ id, camelId })
}

// Generate new theme-presets.ts
const imports = exportNames.map((t) => `import { ${t.camelId} } from '~/config/themes/${t.id}'`).join('\n')
const presetsEntries = exportNames.map((t) => `  '${t.id}': ${t.camelId},`).join('\n')

const newPresetsFile = `import type { ThemePresets } from '~/types/theme'
${imports}

export const defaultPresets: ThemePresets = {
${presetsEntries}
}
`

fs.writeFileSync(inputPath, newPresetsFile)

console.log(`Successfully extracted ${exportNames.length} themes into ${outputDir}`)

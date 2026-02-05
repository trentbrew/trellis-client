const fs = require('fs')
const path = require('path')

const presetsMdPath = path.join(process.cwd(), 'docs', 'PRESETS.md')
const presetsTsPath = path.join(process.cwd(), 'app', 'config', 'presets.ts')

try {
  let content = fs.readFileSync(presetsMdPath, 'utf-8')

  // Replace import statement
  content = content.replace(
    "import { ThemePreset } from '../types/theme'",
    "import type { ThemePreset, ThemePresets } from '~/types/theme'",
  )

  // Replace Record type
  content = content.replace('Record<string, ThemePreset>', 'ThemePresets')

  // Add source property to presets that don't have it
  // This regex finds preset entries and adds source after the opening brace if missing
  content = content.replace(/('[\w-]+':\s*\{)(\s*\n\s*)(label:)/g, (match, opening, whitespace, label) => {
    // Check if source already exists in the next few lines
    const afterMatch = content.substring(content.indexOf(match) + match.length)
    const nextLines = afterMatch.split('\n').slice(0, 5).join('\n')
    if (nextLines.includes('source:')) {
      return match
    }
    // Add source property
    return `${opening}${whitespace}    source: 'BUILT_IN',${whitespace}${label}`
  })

  // Write to presets.ts
  fs.writeFileSync(presetsTsPath, content, 'utf-8')

  // Count presets
  const presetMatches = content.match(/'[\w-]+':\s*\{/g)
  const presetCount = presetMatches ? presetMatches.length : 0
  console.log(`✅ Successfully extracted ${presetCount} presets from PRESETS.md`)
  console.log(`   File written to: ${presetsTsPath}`)
} catch (error) {
  console.error('Error extracting presets:', error)
  process.exit(1)
}

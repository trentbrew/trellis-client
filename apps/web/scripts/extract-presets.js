const fs = require('fs')
const path = require('path')

const presetsMdPath = path.join(process.cwd(), 'docs', 'PRESETS.md')
const presetsTsPath = path.join(process.cwd(), 'app', 'config', 'presets.ts')

try {
  const content = fs.readFileSync(presetsMdPath, 'utf-8')

  // Find the start of the TypeScript code (after ```ts)
  const startMarker = '```ts'
  const endMarker = '```'

  const startIdx = content.indexOf(startMarker)
  if (startIdx === -1) {
    console.error('Could not find start marker')
    process.exit(1)
  }

  // Find the end marker after the start
  const endIdx = content.indexOf(endMarker, startIdx + startMarker.length)
  if (endIdx === -1) {
    console.error('Could not find end marker')
    process.exit(1)
  }

  // Extract the content between markers
  const tsCode = content.substring(startIdx + startMarker.length, endIdx).trim()

  // Update the import to match our structure
  const updatedCode = tsCode
    .replace(
      "import { ThemePreset } from '../types/theme'",
      "import type { ThemePreset, ThemePresets } from '~/types/theme'",
    )
    .replace('Record<string, ThemePreset>', 'ThemePresets')

  // Add source property to all presets
  const withSource = updatedCode.replace(/(\w+):\s*\{[\s\S]*?label:/g, (match) => {
    // Check if source already exists
    if (match.includes('source:')) {
      return match
    }
    // Add source after the opening brace
    return match.replace('{', "{\n    source: 'BUILT_IN',")
  })

  // Write to presets.ts
  fs.writeFileSync(presetsTsPath, withSource, 'utf-8')

  // Count presets
  const presetCount = (withSource.match(/'[^']+':\s*\{/g) || []).length
  console.log(`✅ Successfully extracted ${presetCount} presets from PRESETS.md to app/config/presets.ts`)
} catch (error) {
  console.error('Error extracting presets:', error)
  process.exit(1)
}

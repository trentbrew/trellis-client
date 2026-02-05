/**
 * Script to extract theme presets from docs/PRESETS.md
 * Run with: npx tsx scripts/extract-presets.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const presetsMdPath = join(process.cwd(), 'docs', 'PRESETS.md')
const presetsTsPath = join(process.cwd(), 'app', 'config', 'presets.ts')

try {
  const content = readFileSync(presetsMdPath, 'utf-8')

  // Extract the TypeScript code block
  const match = content.match(/```ts\n([\s\S]*?)\n```/)

  if (!match) {
    console.error('Could not find TypeScript code block in PRESETS.md')
    process.exit(1)
  }

  const tsCode = match[1]

  // Write to presets.ts
  writeFileSync(presetsTsPath, tsCode, 'utf-8')

  console.log('✅ Successfully extracted presets from PRESETS.md to app/config/presets.ts')
  console.log(`   Found ${tsCode.split('export const defaultPresets').length - 1} preset definitions`)
} catch (error) {
  console.error('Error extracting presets:', error)
  process.exit(1)
}

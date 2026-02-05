import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const presetsMdPath = path.join(rootDir, 'docs', 'PRESETS.md')
const presetsTsPath = path.join(rootDir, 'app', 'config', 'presets.ts')

try {
  let content = fs.readFileSync(presetsMdPath, 'utf-8')

  // Fix import statement
  content = content.replace(
    "import { ThemePreset } from '../types/theme'",
    "import type { ThemePreset, ThemePresets } from '~/types/theme'",
  )

  // Fix type declaration
  content = content.replace('Record<string, ThemePreset>', 'ThemePresets')

  // Process lines to add source property and fix indentation
  const lines = content.split('\n')
  const result = []
  let indentLevel = 0
  let inPreset = false
  let presetStartLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Handle import and export
    if (trimmed.startsWith('import') || trimmed.startsWith('export')) {
      result.push(line)
      continue
    }

    // Detect preset start: 'preset-name': {
    const presetMatch = trimmed.match(/^'([^']+)':\s*\{$/)
    if (presetMatch) {
      inPreset = true
      presetStartLine = i
      indentLevel = 2
      result.push('  ' + trimmed)
      continue
    }

    // Check if we need to add source property
    if (inPreset && presetStartLine >= 0) {
      // Look ahead to see if source exists
      let hasSource = false
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('source:')) {
          hasSource = true
          break
        }
        if (lines[j].includes('label:')) {
          break
        }
      }

      // If we found label: and no source, add source before it
      if (trimmed.startsWith('label:') && !hasSource) {
        const indent = ' '.repeat(indentLevel)
        result.push(`${indent}    source: 'BUILT_IN',`)
        result.push(`${indent}${trimmed}`)
        presetStartLine = -1 // Reset
        continue
      }
    }

    // Handle closing braces
    if (trimmed === '},' || trimmed === '}') {
      if (trimmed === '}') {
        result.push(trimmed)
        break
      }
      if (indentLevel >= 2) {
        indentLevel = Math.max(0, indentLevel - 2)
      }
      result.push(' '.repeat(indentLevel) + trimmed)
      if (indentLevel === 0) {
        inPreset = false
      }
      continue
    }

    // Calculate indentation for other lines
    let currentIndent = indentLevel
    if (trimmed.endsWith('{')) {
      result.push(' '.repeat(currentIndent) + trimmed)
      indentLevel += 2
    } else if (trimmed && !trimmed.startsWith('//')) {
      result.push(' '.repeat(currentIndent) + trimmed)
    } else {
      result.push(line)
    }
  }

  const finalContent = result.join('\n')

  // Write to presets.ts
  fs.writeFileSync(presetsTsPath, finalContent, 'utf-8')

  // Count presets
  const presetMatches = finalContent.match(/'[\w-]+':\s*\{/g)
  const presetCount = presetMatches ? presetMatches.length : 0
  console.log(`✅ Successfully extracted ${presetCount} presets from PRESETS.md`)
  console.log(`   File written to: ${presetsTsPath}`)
} catch (error) {
  console.error('Error extracting presets:', error)
  process.exit(1)
}

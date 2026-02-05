const fs = require('fs')
const path = require('path')

const presetsMdPath = path.join(process.cwd(), 'docs', 'PRESETS.md')
const presetsTsPath = path.join(process.cwd(), 'app', 'config', 'presets.ts')

try {
  let content = fs.readFileSync(presetsMdPath, 'utf-8')

  // Fix import statement
  content = content.replace(
    "import { ThemePreset } from '../types/theme'",
    "import type { ThemePreset, ThemePresets } from '~/types/theme'",
  )

  // Fix type declaration
  content = content.replace('Record<string, ThemePreset>', 'ThemePresets')

  // Fix indentation - the file has inconsistent indentation
  // Presets start at column 0, but should be indented
  const lines = content.split('\n')
  const result = []
  let indentLevel = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) {
      result.push('')
      continue
    }

    // Handle import and export lines
    if (trimmed.startsWith('import') || trimmed.startsWith('export')) {
      result.push(line)
      continue
    }

    // Detect preset start: 'preset-name': {
    if (trimmed.match(/^'[\w-]+':\s*\{$/)) {
      indentLevel = 2
      result.push('  ' + trimmed)
      continue
    }

    // Detect closing braces
    if (trimmed === '},' || trimmed === '}') {
      if (trimmed === '}') {
        // Final closing brace
        result.push(trimmed)
        break
      }
      indentLevel = Math.max(0, indentLevel - 2)
      result.push(' '.repeat(indentLevel) + trimmed)
      continue
    }

    // Calculate proper indentation
    // If line starts with a quote or key, it's likely a property
    let indent = indentLevel
    if (trimmed.startsWith("'") || trimmed.match(/^\w+:/)) {
      // Property line
      indent = indentLevel
    } else if (trimmed.startsWith('styles:') || trimmed.startsWith('light:') || trimmed.startsWith('dark:')) {
      // Nested object
      indent = indentLevel
    }

    result.push(' '.repeat(indent) + trimmed)

    // Adjust indent level for opening braces
    if (trimmed.endsWith('{')) {
      indentLevel += 2
    }
  }

  // Add source property to presets that don't have it
  const finalContent = result.join('\n')
  const withSource = finalContent.replace(
    /('[\w-]+':\s*\{)(\s*\n\s*)(label:)/g,
    (match, opening, whitespace, label) => {
      // Check if source already exists
      const afterPos = finalContent.indexOf(match) + match.length
      const next50Chars = finalContent.substring(afterPos, afterPos + 200)
      if (next50Chars.includes('source:')) {
        return match
      }
      // Add source property
      const indent = ' '.repeat(opening.match(/^\s*/)[0].length + 2)
      return `${opening}${whitespace}${indent}source: 'BUILT_IN',${whitespace}${label}`
    },
  )

  // Write to presets.ts
  fs.writeFileSync(presetsTsPath, withSource, 'utf-8')

  // Count presets
  const presetMatches = withSource.match(/'[\w-]+':\s*\{/g)
  const presetCount = presetMatches ? presetMatches.length : 0
  console.log(`✅ Successfully extracted ${presetCount} presets from PRESETS.md`)
  console.log(`   File written to: ${presetsTsPath}`)
} catch (error) {
  console.error('Error extracting presets:', error)
  process.exit(1)
}

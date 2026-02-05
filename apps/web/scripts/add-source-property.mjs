import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const filePath = path.join(__dirname, '..', 'theme-presets.ts')

try {
  let content = fs.readFileSync(filePath, 'utf-8')

  // Add source property to all presets that don't have it
  // Pattern: 'preset-name': { followed by label:
  content = content.replace(/( {2}'[^']+': \{\n)( {4}label:)/g, "$1    source: 'BUILT_IN',\n$2")
  const afterCount = (content.match(/source: 'BUILT_IN'/g) || []).length

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ Added source property to ${afterCount} presets`)
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

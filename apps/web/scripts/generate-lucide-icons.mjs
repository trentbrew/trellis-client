import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

try {
  // Try multiple ways to load the icons
  let lucide

  // Method 1: Require the main module
  try {
    const lucideModule = require('@iconify-json/lucide')
    lucide = lucideModule.icons || lucideModule
  } catch (e1) {
    // Method 2: Read icons.json directly
    try {
      const lucidePath = path.join(__dirname, '../node_modules/@iconify-json/lucide/icons.json')
      lucide = JSON.parse(fs.readFileSync(lucidePath, 'utf8'))
    } catch (e2) {
      throw new Error(`Failed to load icons: ${e1.message} / ${e2.message}`)
    }
  }

  if (!lucide || !lucide.icons) {
    throw new Error('Invalid icon data - missing "icons" property')
  }

  const iconKeys = Object.keys(lucide.icons)
  console.log(`Found ${iconKeys.length} icons`)

  // Generate icons
  const icons = iconKeys.map((name) => ({
    name: `lucide:${name}`,
    tags: [],
  }))

  // Create categories based on icon name patterns
  const categoryMap = {
    Arrows: ['arrow', 'chevron', 'move', 'navigation'],
    Communication: ['mail', 'message', 'phone', 'chat', 'send', 'share'],
    Media: ['image', 'video', 'camera', 'film', 'music', 'play', 'pause'],
    Files: ['file', 'folder', 'document', 'archive', 'download', 'upload'],
    UI: ['menu', 'settings', 'more', 'close', 'check', 'x', 'plus', 'minus'],
    Shapes: ['circle', 'square', 'triangle', 'hexagon', 'pentagon'],
    Data: ['database', 'table', 'chart', 'graph', 'bar', 'line'],
    Time: ['clock', 'calendar', 'timer', 'alarm'],
    Users: ['user', 'users', 'person', 'people'],
    Business: ['briefcase', 'building', 'store', 'shop'],
    Nature: ['leaf', 'tree', 'flower', 'sun', 'moon', 'cloud'],
    Food: ['coffee', 'utensils', 'apple', 'cherry'],
    Transport: ['car', 'bike', 'plane', 'train', 'ship'],
    Other: [],
  }

  const iconsByCategory = new Map()

  icons.forEach((icon) => {
    const iconName = icon.name.replace('lucide:', '').toLowerCase()
    let categorized = false

    for (const [category, patterns] of Object.entries(categoryMap)) {
      if (patterns.some((pattern) => iconName.includes(pattern))) {
        const categoryIcons = iconsByCategory.get(category) || []
        categoryIcons.push(icon)
        iconsByCategory.set(category, categoryIcons)
        categorized = true
        break
      }
    }

    if (!categorized) {
      const other = iconsByCategory.get('Other') || []
      other.push(icon)
      iconsByCategory.set('Other', other)
    }
  })

  // Convert to array format
  const categories = Array.from(iconsByCategory.entries())
    .map(([category, categoryIcons]) => ({
      name: category,
      icons: categoryIcons.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.name === 'Other') return 1
      if (b.name === 'Other') return -1
      return a.name.localeCompare(b.name)
    })

  const output = {
    icons: icons.sort((a, b) => a.name.localeCompare(b.name)),
    categories,
    totalCount: icons.length,
  }

  const outputPath = path.join(__dirname, '../app/data/lucide-icons.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')

  console.log(`✓ Generated ${icons.length} icons in ${categories.length} categories`)
  console.log(`✓ Output written to ${outputPath}`)
} catch (error) {
  console.error('Error generating icons:', error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

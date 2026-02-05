import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import lucide from '@iconify-json/lucide/icons.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Generate icons from Iconify format
const icons = Object.keys(lucide.icons).map((name) => ({
  name: `lucide:${name}`,
  tags: lucide.icons[name].tags || [],
  categories: lucide.icons[name].categories || [],
}))

// Group icons by category
const iconsByCategory = new Map<string, typeof icons>()

icons.forEach((icon) => {
  if (icon.categories.length === 0) {
    const uncategorized = iconsByCategory.get('Uncategorized') || []
    uncategorized.push(icon)
    iconsByCategory.set('Uncategorized', uncategorized)
  } else {
    icon.categories.forEach((category) => {
      const categoryIcons = iconsByCategory.get(category) || []
      categoryIcons.push(icon)
      iconsByCategory.set(category, categoryIcons)
    })
  }
})

// Convert to array format
const categories = Array.from(iconsByCategory.entries())
  .map(([category, categoryIcons]) => ({
    name: category,
    icons: categoryIcons.sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort((a, b) => {
    if (a.name === 'Uncategorized') return 1
    if (b.name === 'Uncategorized') return -1
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

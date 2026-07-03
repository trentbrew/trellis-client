#!/usr/bin/env node
/**
 * Regenerate markdown table rows for packages/trellis-kernel file inventory.
 * Usage: node scripts/audit-kernel-fork-inventory.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..', 'packages', 'trellis-kernel')

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist'])

async function walk(dir, acc = []) {
  for (const name of await readdir(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    const st = await stat(full)
    if (st.isDirectory()) {
      await walk(full, acc)
      continue
    }
    if (/\.tsx?$/.test(name)) acc.push(full)
  }
  return acc
}

function firstExportLine(source) {
  const m = source.match(/^export (?:type )?(?:\{[^}]+\}|class \w+|function \w+|\w+)/m)
  return m ? m[0].slice(0, 60) : '—'
}

const files = (await walk(ROOT)).sort()
console.log('| File | LOC | Primary exports |')
console.log('|------|-----|-----------------|')
for (const full of files) {
  const rel = relative(join(import.meta.dirname, '..'), full)
  const source = await readFile(full, 'utf8')
  const loc = source.split('\n').length
  const exp = firstExportLine(source).replace(/\|/g, '\\|')
  console.log(`| \`${rel}\` | ${loc} | ${exp} |`)
}

console.error(`\n# ${files.length} source files under packages/trellis-kernel`)

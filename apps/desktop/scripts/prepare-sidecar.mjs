#!/usr/bin/env node

/**
 * prepare-sidecar.mjs
 *
 * Packages the Nuxt/Nitro server output as a Node.js SEA (Single Executable
 * Application) sidecar binary for each target platform.
 *
 * For local dev builds, it creates a sidecar for the current platform only.
 * For CI, set TARGET_TRIPLE env var to build for a specific platform.
 *
 * Steps:
 *   1. Verify apps/web/.output exists (run `pnpm --filter @trellis/web build` first)
 *   2. Generate a SEA config blob from the Nitro server entry
 *   3. Copy the Node.js binary and inject the SEA blob
 *   4. Place the result in src-tauri/binaries/ with the Tauri naming convention
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const WEB_OUTPUT = resolve(ROOT, '../web/.output')
const BINARIES_DIR = resolve(ROOT, 'src-tauri/binaries')
const RESOURCES_DIR = resolve(ROOT, 'src-tauri/resources')

// Tauri target triple detection
function getTargetTriple() {
  if (process.env.TARGET_TRIPLE) return process.env.TARGET_TRIPLE

  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
  const platform = process.platform

  if (platform === 'darwin') return `${arch}-apple-darwin`
  if (platform === 'win32') return `${arch}-pc-windows-msvc`
  if (platform === 'linux') return `${arch}-unknown-linux-gnu`

  throw new Error(`Unsupported platform: ${platform}`)
}

function main() {
  const triple = getTargetTriple()
  const isWindows = triple.includes('windows')
  const ext = isWindows ? '.exe' : ''
  const sidecarName = `nitro-server-${triple}${ext}`

  console.log(`[prepare-sidecar] Target: ${triple}`)
  console.log(`[prepare-sidecar] Sidecar name: ${sidecarName}`)

  // 1. Verify web output exists
  if (!existsSync(WEB_OUTPUT)) {
    console.error('[prepare-sidecar] apps/web/.output not found. Run:')
    console.error('  pnpm --filter @trellis/web build')
    process.exit(1)
  }

  // 2. Copy Nitro server output to resources
  console.log('[prepare-sidecar] Copying Nitro server output to resources...')
  if (existsSync(RESOURCES_DIR)) rmSync(RESOURCES_DIR, { recursive: true })
  mkdirSync(RESOURCES_DIR, { recursive: true })
  cpSync(WEB_OUTPUT, resolve(RESOURCES_DIR, 'nitro-server'), { recursive: true })

  // 3. Create SEA config
  mkdirSync(BINARIES_DIR, { recursive: true })
  const seaEntry = resolve(RESOURCES_DIR, 'nitro-server/server/index.mjs')
  if (!existsSync(seaEntry)) {
    console.error(`[prepare-sidecar] Nitro entry not found at ${seaEntry}`)
    process.exit(1)
  }

  const seaConfig = {
    main: seaEntry,
    output: resolve(BINARIES_DIR, 'sea-prep.blob'),
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: true,
  }

  const seaConfigPath = resolve(BINARIES_DIR, 'sea-config.json')
  writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2))
  console.log('[prepare-sidecar] Generated SEA config')

  // 4. Generate the SEA blob
  console.log('[prepare-sidecar] Generating SEA blob...')
  execSync(`node --experimental-sea-config "${seaConfigPath}"`, {
    stdio: 'inherit',
    cwd: ROOT,
  })

  // 5. Copy node binary and inject SEA blob
  const nodeBin = process.execPath
  const outputBin = resolve(BINARIES_DIR, sidecarName)
  console.log(`[prepare-sidecar] Copying node binary: ${nodeBin}`)
  cpSync(nodeBin, outputBin)

  // Remove code signature on macOS before injection
  if (process.platform === 'darwin') {
    console.log('[prepare-sidecar] Removing macOS code signature...')
    try {
      execSync(`codesign --remove-signature "${outputBin}"`, { stdio: 'inherit' })
    } catch {
      console.warn('[prepare-sidecar] codesign removal failed (may be unsigned already)')
    }
  }

  // Inject the blob
  const blobPath = resolve(BINARIES_DIR, 'sea-prep.blob')
  console.log('[prepare-sidecar] Injecting SEA blob...')
  execSync(
    `npx --yes postject "${outputBin}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2${process.platform === 'darwin' ? ' --macho-segment-name NODE_SEA' : ''}`,
    { stdio: 'inherit', cwd: ROOT },
  )

  // Re-sign on macOS
  if (process.platform === 'darwin') {
    console.log('[prepare-sidecar] Re-signing binary for macOS...')
    execSync(`codesign --sign - "${outputBin}"`, { stdio: 'inherit' })
  }

  // Clean up temp files
  rmSync(seaConfigPath, { force: true })
  rmSync(blobPath, { force: true })

  console.log(`[prepare-sidecar] Done! Sidecar binary: ${outputBin}`)
}

main()

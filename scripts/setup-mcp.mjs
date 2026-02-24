#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

const ASSISTANTS = {
  claude: {
    name: 'Claude Code',
    configPath: join(homedir(), '.claude', 'settings.json'),
    configKey: 'mcpServers',
  },
  windsurf: {
    name: 'Windsurf (Codeium)',
    configPath: join(homedir(), '.codeium', 'windsurf', 'mcp_settings.json'),
    configKey: 'mcpServers',
  },
  cursor: {
    name: 'Cursor',
    configPath: join(homedir(), '.cursor', 'mcp.json'),
    configKey: 'mcpServers',
  },
  continue: {
    name: 'Continue',
    configPath: join(homedir(), '.continue', 'config.json'),
    configKey: 'experimental.modelContextProtocolServers',
  },
}

const TRELLIS_MCP_CONFIG = {
  command: 'node',
  args: [join(repoRoot, 'packages/trellis-mcp/bin/serve.mjs')],
  env: {
    TRELLIS_PORT: '1414',
    TRELLIS_AGENT_ID: 'mcp-client',
  },
}

function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }
  console.log(`${icons[type]}  ${message}`)
}

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function writeJSON(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj)
  target[lastKey] = value
}

function setupAssistant(assistantKey) {
  const assistant = ASSISTANTS[assistantKey]
  if (!assistant) {
    log(`Unknown assistant: ${assistantKey}`, 'error')
    return false
  }

  log(`Setting up ${assistant.name}...`)

  let config = readJSON(assistant.configPath) || {}
  const servers = getNestedValue(config, assistant.configKey) || {}

  const agentId = assistantKey === 'claude' ? 'claude-code' : assistantKey

  servers.trellis = {
    ...TRELLIS_MCP_CONFIG,
    env: {
      ...TRELLIS_MCP_CONFIG.env,
      TRELLIS_AGENT_ID: agentId,
    },
  }

  setNestedValue(config, assistant.configKey, servers)
  writeJSON(assistant.configPath, config)

  log(`${assistant.name} configured at ${assistant.configPath}`, 'success')
  log(`Agent ID: ${agentId}`, 'info')
  return true
}

function verifyDevServer() {
  log('Checking dev server...')
  try {
    const response = fetch('http://localhost:1414/api/graph/health')
      .then((r) => r.json())
      .then(() => {
        log('Dev server is running on port 1414', 'success')
        return true
      })
      .catch(() => {
        log('Dev server not running. Start it with: just dev-v2', 'warn')
        return false
      })
    return response
  } catch {
    log('Dev server not running. Start it with: just dev-v2', 'warn')
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const assistantArg = args[0]

  console.log('\n🔧 Trellis MCP Setup\n')

  if (!assistantArg || assistantArg === '--help' || assistantArg === '-h') {
    console.log('Usage: node scripts/setup-mcp.mjs <assistant> [options]\n')
    console.log('Assistants:')
    Object.entries(ASSISTANTS).forEach(([key, { name }]) => {
      console.log(`  ${key.padEnd(12)} ${name}`)
    })
    console.log('\nOptions:')
    console.log('  --all        Configure all assistants')
    console.log('  --verify     Verify dev server is running')
    console.log('\nExample:')
    console.log('  node scripts/setup-mcp.mjs claude')
    console.log('  node scripts/setup-mcp.mjs --all')
    console.log('  pnpm setup:mcp claude\n')
    return
  }

  if (args.includes('--verify')) {
    await verifyDevServer()
    return
  }

  if (assistantArg === '--all') {
    console.log('Configuring all assistants...\n')
    let successCount = 0
    for (const key of Object.keys(ASSISTANTS)) {
      if (setupAssistant(key)) successCount++
      console.log()
    }
    log(`Configured ${successCount}/${Object.keys(ASSISTANTS).length} assistants`, 'success')
  } else {
    setupAssistant(assistantArg)
  }

  console.log('\n📋 Next steps:')
  console.log('  1. Restart your AI coding assistant')
  console.log('  2. Verify dev server is running: just dev-v2')
  console.log('  3. Test with: "Use the graph_health tool"\n')

  await verifyDevServer()
}

main().catch((err) => {
  log(err.message, 'error')
  process.exit(1)
})

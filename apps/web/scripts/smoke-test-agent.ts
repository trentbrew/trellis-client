#!/usr/bin/env tsx
/**
 * Smoke test for the agent chat endpoint.
 *
 * Hits the running dev server's /api/agent/chat endpoint with a battery
 * of representative messages and validates:
 *   - HTTP 200 + SSE content-type
 *   - Initial `meta` event with model/router/taskClass/rationale
 *   - Routing decision matches expected taskClass per message type
 *   - At least one `text` event arrives
 *   - Stream ends with `done` event (or fails fast with `error`)
 *
 * Usage:
 *   pnpm tsx scripts/smoke-test-agent.ts
 *   pnpm tsx scripts/smoke-test-agent.ts --port=1414
 *   pnpm tsx scripts/smoke-test-agent.ts --skip-network    # validate only the routing decisions
 *
 * Exits with code 0 on success, 1 on any failure. Designed to be safe to
 * include in CI once we have a local Ollama runtime with the Gemma model pulled.
 */

import { resolveRoutingDecision } from '../server/utils/agent-routing'

interface SmokeCase {
  label: string
  message: string
  expectedTaskClass: 'lookup' | 'synthesis' | 'reasoning' | 'creative' | 'override'
  expectedModelMatch: RegExp
}

const CASES: SmokeCase[] = [
  {
    label: 'lookup-tasks',
    message: 'Show me my tasks',
    expectedTaskClass: 'lookup',
    expectedModelMatch: /gemma/i,
  },
  {
    label: 'reasoning-plan',
    message: 'Plan my Q3 roadmap and recommend the top three priorities',
    expectedTaskClass: 'reasoning',
    expectedModelMatch: /gemma/i,
  },
  {
    label: 'creative-draft',
    message: 'Draft a standup update summarizing this week',
    expectedTaskClass: 'creative',
    expectedModelMatch: /gemma/i,
  },
  {
    label: 'synthesis-default',
    message: 'tell me about Trellis',
    expectedTaskClass: 'synthesis',
    expectedModelMatch: /gemma/i,
  },
]

interface StreamResult {
  meta: Record<string, unknown> | null
  textChunks: number
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>
  errors: string[]
  doneReceived: boolean
  rawEventCount: number
}

const args = process.argv.slice(2)
const portArg = args.find((a) => a.startsWith('--port='))?.split('=')[1]
const PORT = portArg || process.env.TRELLIS_PORT || '1414'
const BASE = `http://localhost:${PORT}`
const SKIP_NETWORK = args.includes('--skip-network')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function pass(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}
function fail(msg: string) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`)
}
function info(msg: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`)
}

async function readSseStream(response: Response, timeoutMs = 30_000): Promise<StreamResult> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()

  const result: StreamResult = {
    meta: null,
    textChunks: 0,
    toolCalls: [],
    errors: [],
    doneReceived: false,
    rawEventCount: 0,
  }

  let buffer = ''
  const startTime = Date.now()

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      result.errors.push(`Timeout after ${timeoutMs}ms`)
      break
    }
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload) continue

      let evt: any
      try {
        evt = JSON.parse(payload)
      } catch {
        result.errors.push(`Malformed SSE payload: ${payload.slice(0, 100)}`)
        continue
      }
      result.rawEventCount++

      switch (evt.type) {
        case 'meta':
          result.meta = { ...(result.meta || {}), ...evt }
          break
        case 'text':
          result.textChunks++
          break
        case 'tool':
          result.toolCalls.push({ name: evt.tool, args: evt.args, result: evt.result })
          break
        case 'error':
          result.errors.push(evt.message)
          break
        case 'done':
          result.doneReceived = true
          break
      }
    }

    if (result.doneReceived) break
  }

  return result
}

function assertRoutingPure(c: SmokeCase): boolean {
  const decision = resolveRoutingDecision(c.message, undefined)
  const okClass = decision.taskClass === c.expectedTaskClass
  const okModel = c.expectedModelMatch.test(decision.model)

  if (okClass && okModel) {
    pass(`[${c.label}] classifier: ${decision.taskClass} → ${decision.model}`)
    return true
  }

  if (!okClass) fail(`[${c.label}] expected taskClass=${c.expectedTaskClass}, got ${decision.taskClass}`)
  if (!okModel) fail(`[${c.label}] model "${decision.model}" does not match ${c.expectedModelMatch}`)
  return false
}

async function assertLiveTurn(c: SmokeCase): Promise<boolean> {
  const url = `${BASE}/api/agent/chat`
  console.log(`\n${colors.cyan}— [${c.label}] POST ${url}${colors.reset}`)
  console.log(`${colors.dim}  message: ${c.message}${colors.reset}`)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: c.message,
        userId: 'smoke-test',
        path: '/home',
      }),
    })
  } catch (err: any) {
    fail(`[${c.label}] fetch failed: ${err.message}`)
    return false
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable body>')
    fail(`[${c.label}] HTTP ${res.status} — ${body.slice(0, 200)}`)
    return false
  }

  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('text/event-stream')) {
    fail(`[${c.label}] expected SSE, got content-type=${ct}`)
    return false
  }

  let stream: StreamResult
  try {
    stream = await readSseStream(res)
  } catch (err: any) {
    fail(`[${c.label}] stream read failed: ${err.message}`)
    return false
  }

  let allOk = true

  if (!stream.meta) {
    fail(`[${c.label}] no meta event received`)
    allOk = false
  } else {
    const m = stream.meta as Record<string, unknown>
    if (m.router !== 'ollama') {
      fail(`[${c.label}] meta.router=${m.router}, expected ollama`)
      allOk = false
    } else {
      pass(`[${c.label}] meta.router=ollama`)
    }
    if (m.taskClass !== c.expectedTaskClass) {
      fail(`[${c.label}] meta.taskClass=${m.taskClass}, expected ${c.expectedTaskClass}`)
      allOk = false
    } else {
      pass(`[${c.label}] meta.taskClass=${m.taskClass}`)
    }
    if (typeof m.model !== 'string' || !c.expectedModelMatch.test(m.model)) {
      fail(`[${c.label}] meta.model=${m.model}, expected match ${c.expectedModelMatch}`)
      allOk = false
    } else {
      pass(`[${c.label}] meta.model=${m.model}`)
    }
    if (typeof m.rationale !== 'string' || m.rationale.length === 0) {
      fail(`[${c.label}] meta.rationale missing or empty`)
      allOk = false
    }
  }

  if (stream.errors.length > 0) {
    for (const e of stream.errors) fail(`[${c.label}] error event: ${e}`)
    allOk = false
  }

  if (stream.textChunks === 0 && stream.toolCalls.length === 0) {
    fail(`[${c.label}] no text or tool output received from model`)
    allOk = false
  } else {
    pass(`[${c.label}] received ${stream.textChunks} text chunks, ${stream.toolCalls.length} tool calls`)
  }

  if (!stream.doneReceived) {
    fail(`[${c.label}] stream did not emit done event`)
    allOk = false
  }

  return allOk
}

async function main() {
  console.log(`${colors.cyan}🔬 Trellis Agent Smoke Test${colors.reset}`)
  console.log(`${colors.dim}  Target: ${BASE}${colors.reset}`)
  console.log(`${colors.dim}  Mode:   ${SKIP_NETWORK ? 'pure (no network)' : 'live (Ollama)'}${colors.reset}\n`)

  let total = 0
  let passed = 0

  console.log(`${colors.yellow}── Phase 1: Pure routing decisions ──${colors.reset}`)
  for (const c of CASES) {
    total++
    if (assertRoutingPure(c)) passed++
  }

  if (!SKIP_NETWORK) {
    console.log(`\n${colors.yellow}── Phase 2: Live Ollama round-trip ──${colors.reset}`)

    // Health probe first.
    try {
      const health = await fetch(`${BASE}/api/graph/health`)
      if (!health.ok) {
        fail(`Dev server unreachable at ${BASE} (HTTP ${health.status}). Start it with \`pnpm dev\` and re-run.`)
        process.exit(1)
      }
      pass('dev server is reachable')
    } catch (err: any) {
      fail(`Cannot reach ${BASE}/api/graph/health: ${err.message}`)
      info(`Hint: start the dev server with \`pnpm dev\` from apps/web/`)
      process.exit(1)
    }

    for (const c of CASES) {
      total++
      if (await assertLiveTurn(c)) passed++
    }
  }

  console.log()
  if (passed === total) {
    console.log(`${colors.green}✓ All ${total} checks passed${colors.reset}`)
    process.exit(0)
  } else {
    console.log(`${colors.red}✗ ${total - passed} of ${total} checks failed${colors.reset}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`${colors.red}Smoke test crashed:${colors.reset}`, err)
  process.exit(1)
})

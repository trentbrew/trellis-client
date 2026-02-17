/**
 * SSE endpoint for realtime graph mutation events.
 *
 * Clients connect via `GET /api/graph/events` and receive a stream of
 * Server-Sent Events whenever the graph is mutated. This enables:
 * - Browser UI to update in realtime when an agent/CLI writes data
 * - CLI `trellis watch` command to stream mutations
 * - Future webhook/integration consumers
 *
 * Protocol: standard SSE (text/event-stream)
 *   event: mutation
 *   data: { id, timestamp, action, entityId, type, agentId }
 */

import { onMutation } from '../../utils/tql-events'

export default defineEventHandler(async (event) => {
  const res = event.node.res

  // Set SSE headers
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Flush headers immediately
  res.flushHeaders?.()

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })}\n\n`)

  // Keep-alive ping every 30s to prevent timeout
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keep-alive\n\n`)
    } catch {
      clearInterval(keepAlive)
    }
  }, 30_000)

  // Subscribe to mutation events
  const unsubscribe = onMutation((mutation) => {
    try {
      const payload = JSON.stringify(mutation)
      res.write(`id: ${mutation.id}\nevent: mutation\ndata: ${payload}\n\n`)
    } catch {
      clearInterval(keepAlive)
      unsubscribe()
    }
  })

  // Clean up when the client disconnects
  event.node.req.on('close', () => {
    clearInterval(keepAlive)
    unsubscribe()
  })

  // Keep the handler alive — resolved when client disconnects
  await new Promise<void>((resolve) => {
    event.node.req.on('close', resolve)
  })
})

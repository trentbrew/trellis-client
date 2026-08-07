import OpenAI from 'openai'
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import { useTrellisKernel, pushMutationLog } from '../../plugins/trellis-kernel'
import { emitMutation } from '../../utils/trellis-events'
import { appendLatestUserMessage } from '../../lib/agent-attachment-content'
import { buildAgentChatMessagesFromHistory } from '../../lib/agent-chat-history'
import {
  accumulateStreamedToolCalls,
  appendAssistantToolTurn,
  appendToolResultMessage,
  normalizeMessagesForProvider,
  type AccumulatedToolCall,
} from '../../lib/agent-chat-tools'
import { resolveRoutingDecision, type RoutingDecision } from '../../utils/agent-routing'

const GRAPH_SYSTEM_PROMPT_TEMPLATE = `You are a graph-aware AI agent embedded in the Trellis personal knowledge graph.
Your primary job is to help the user query, explore, and modify their graph.
You have access to tools that interact directly with the TQL kernel.

IMPORTANT RULES FOR EQL-S QUERIES:
1. Use \`FIND entity AS ?e WHERE ?e.type = "task"\` syntax.
2. NEVER query for an \`id\` attribute (e.g., \`?e.id\`). The \`id\` attribute does not exist. If you need the node's ID, just return the node itself (\`RETURN ?e\`).
3. Always check the graph summary first if you don't know the schema.

CONTEXT:
User is currently on path: {{CURRENT_PATH}}

Be concise, helpful, and take action when requested.

You have full read/write access to the user's TQL graph via function calls. The graph stores:
- **Entities**: tasks, notes, people, projects, files, events, etc. with typed properties
- **Links**: references, mentions, dependencies, assignments between entities
- **Ontologies**: schema definitions for entity types

## Your Capabilities

When users ask about their data, query the graph first using EQL-S.
When users ask to create or modify data, use the mutation functions.
Be proactive: suggest connections, identify patterns, offer to create entities.

## Response Style

- Concise and technical
- Action-oriented
- Use markdown formatting
- Show entity counts and breakdowns when relevant
- Suggest next actions

## Entity References

- Whenever you mention a specific entity in user-facing text, render it as \`[[entity:<id>|<title>]]\`.
- Use the full TQL ID from tool results, including the \`entity:\` prefix.
- Do not wrap entity IDs in backticks when the entity should be clickable.
- If you are listing entities, start each row with the clickable entity token.
- When querying entities you intend to mention, return the entity itself so you have its ID.

When users attach images, describe and reason about what you see in those images.
When users attach text files, their contents are inlined in the message.

## Available Tools

- queryGraph(eqls) - Execute EQL-S queries to find entities
- getGraphSummary() - Get entity type counts and recent activity
- createEntity(type, data) - Create new entities in the graph
- updateEntity(id, data) - Update existing entities
- linkEntities(e1, relation, e2) - Create semantic links between entities

Always query the graph when users ask about their data. Don't make assumptions.`

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'queryGraph',
      description: 'Execute an EQL-S query against the TQL graph. Use this to find, filter, and analyze entities.',
      parameters: {
        type: 'object',
        properties: {
          eqls: {
            type: 'string',
            description:
              "EQL-S query string. Example: \"FIND entity AS ?e WHERE ?e.type = 'task' AND ?e.taskStatus = 'pending' RETURN ?e.title, ?e.priority\"",
          },
        },
        required: ['eqls'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGraphSummary',
      description: 'Get a high-level overview of the graph: entity type counts, ontologies, recent mutations.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createEntity',
      description: 'Create a new entity in the graph with the specified type and data.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Entity type (e.g., task, note, person, project)',
          },
          data: {
            type: 'object',
            description: 'Entity properties as key-value pairs. Always include a title.',
          },
        },
        required: ['type', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateEntity',
      description: 'Update an existing entity by ID.',
      parameters: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description: 'Entity ID (e.g., entity:task-1)',
          },
          data: {
            type: 'object',
            description: 'Properties to update',
          },
        },
        required: ['entityId', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'linkEntities',
      description: 'Create a semantic link between two entities.',
      parameters: {
        type: 'object',
        properties: {
          e1: {
            type: 'string',
            description: 'Source entity ID',
          },
          relation: {
            type: 'string',
            description: 'Relation type (e.g., assignedTo, references, dependsOn)',
          },
          e2: {
            type: 'string',
            description: 'Target entity ID',
          },
        },
        required: ['e1', 'relation', 'e2'],
      },
    },
  },
]

async function executeToolCall(toolName: string, args: any): Promise<any> {
  const kernel = useTrellisKernel()

  switch (toolName) {
    case 'queryGraph': {
      const result = await kernel.query(args.eqls)
      return { data: result.rows, count: result.rows?.length || 0 }
    }

    case 'getGraphSummary': {
      const store = kernel.getStore()
      let factCount = 0
      for (const _ of store.getAllFacts()) factCount++
      let linkCount = 0
      for (const _ of store.getAllLinks()) linkCount++
      const typeCounts: Record<string, number> = {}
      for (const fact of store.getAllFacts()) {
        if (fact.a === 'type' && fact.e.startsWith('entity:')) {
          typeCounts[String(fact.v)] = (typeCounts[String(fact.v)] || 0) + 1
        }
      }
      const entityTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([type, count]) => ({ type, count }))
      return { factCount, linkCount, entityTypes }
    }

    case 'createEntity': {
      const slug = String(args.data?.title || Date.now())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40)
      const entityId = `entity:${args.type}-${slug}-${Date.now()}`
      const data = { ...args.data, type: args.type }
      await kernel.createNode(entityId, data, 'entity', { agentId: 'agent' })
      pushMutationLog({ action: 'createNode', entityId, type: 'entity', data })
      emitMutation({ action: 'createNode', entityId, type: 'entity', agentId: 'agent', data })
      return { entityId, created: true }
    }

    case 'updateEntity': {
      await kernel.updateNode(args.entityId, args.data, 'entity', { agentId: 'agent' })
      pushMutationLog({ action: 'updateNode', entityId: args.entityId, type: 'entity', data: args.data })
      emitMutation({ action: 'updateNode', entityId: args.entityId, type: 'entity', agentId: 'agent', data: args.data })
      return { entityId: args.entityId, updated: true }
    }

    case 'linkEntities': {
      await kernel.link(args.e1, args.relation, args.e2, { agentId: 'agent' })
      pushMutationLog({ action: 'link', entityId: `${args.e1} -> ${args.e2}`, data: { relation: args.relation } })
      emitMutation({
        action: 'link',
        entityId: `${args.e1} -> ${args.e2}`,
        agentId: 'agent',
        data: { relation: args.relation, e1: args.e1, e2: args.e2 },
      })
      return { linked: true }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1'
const MAX_TOOL_ROUNDS = 15

const completionParams = {
  tools,
  parallel_tool_calls: false as const,
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { message, attachments, history, conversationId: _conversationId, userId, path } = body

  if ((!message || !String(message).trim()) && (!Array.isArray(attachments) || attachments.length === 0)) {
    throw createError({ statusCode: 400, message: 'Missing message or attachments' })
  }

  if (!userId) {
    throw createError({ statusCode: 400, message: 'Missing userId' })
  }

  // Normalize base URL: Ollama exposes an OpenAI-compatible endpoint under /v1.
  // Accept either `http://localhost:11434` or `http://localhost:11434/v1`.
  const rawBaseURL = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '')
  const baseURL = rawBaseURL.endsWith('/v1') ? rawBaseURL : `${rawBaseURL}/v1`

  const hasImages = Array.isArray(attachments)
    && attachments.some((a) => a?.kind === 'image' || String(a?.contentType || '').startsWith('image/'))

  // Routing: OLLAMA_MODEL env overrides classifier; else classify per-request.
  const routingDecision: RoutingDecision = resolveRoutingDecision(
    String(message || ''),
    process.env.OLLAMA_MODEL,
    { hasImages },
  )
  const model = routingDecision.model

  const systemInstruction = GRAPH_SYSTEM_PROMPT_TEMPLATE.replace('{{CURRENT_PATH}}', path || 'Unknown')

  // Ollama is OpenAI-compatible at /v1/chat/completions. Use the openai SDK
  // as a thin client by overriding baseURL. Ollama ignores the apiKey value.
  const client = new OpenAI({ apiKey: 'ollama', baseURL })

  // Prior thread turns (client) + tool rounds within this request.
  const messages: ChatCompletionMessageParam[] = buildAgentChatMessagesFromHistory(
    systemInstruction,
    history,
  )
  await appendLatestUserMessage(messages, String(message || ''), attachments)

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        // Initial meta event — UI shows the routing decision before any tokens stream.
        enqueue({
          type: 'meta',
          model,
          router: 'ollama',
          provider: 'ollama',
          baseURL: baseURL.replace(/^https?:\/\//, ''),
          taskClass: routingDecision.taskClass,
          rationale: routingDecision.rationale,
        })

        // Multi-round tool loop. Round 0 streams to the client; follow-up rounds use
        // non-streaming completions so Ollama gets complete tool_calls blocks.
        // parallel_tool_calls: false keeps one tool_use ↔ tool_result pair per round.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let assistantContent = ''
          let toolCalls: AccumulatedToolCall[] = []
          const providerMessages = normalizeMessagesForProvider(messages)

          try {
            if (round === 0) {
              const completionStream = (await client.chat.completions.create({
                model,
                messages: providerMessages,
                stream: true,
                ...completionParams,
              })) as unknown as AsyncIterable<ChatCompletionChunk>

              async function* streamWithClientEvents() {
                for await (const chunk of completionStream) {
                  const delta = chunk.choices?.[0]?.delta
                  if (delta?.content) {
                    enqueue({ type: 'text', content: delta.content })
                  }
                  yield chunk
                }
              }

              const accumulated = await accumulateStreamedToolCalls(streamWithClientEvents())
              assistantContent = accumulated.content
              toolCalls = accumulated.toolCalls
            } else {
              const response = await client.chat.completions.create({
                model,
                messages: providerMessages,
                stream: false,
                ...completionParams,
              })

              const choice = response.choices?.[0]
              assistantContent = typeof choice?.message?.content === 'string' ? choice.message.content : ''
              if (assistantContent) enqueue({ type: 'text', content: assistantContent })

              toolCalls = (choice?.message?.tool_calls ?? [])
                .filter((tc) => tc.type === 'function' && tc.id && tc.function?.name)
                .map((tc) => ({
                  id: tc.id,
                  name: tc.function!.name,
                  arguments: tc.function!.arguments || '{}',
                }))
            }
          } catch (err: any) {
            const apiErr = err?.error ?? err?.response?.data?.error
            const surfaced = apiErr?.message || err?.message || 'Upstream request failed'
            const code = apiErr?.code || err?.status || ''
            enqueue({
              type: 'error',
              message: code ? `Ollama ${code}: ${surfaced}` : `Ollama: ${surfaced}`,
            })
            break
          }

          if (toolCalls.length === 0) break

          appendAssistantToolTurn(messages, assistantContent, toolCalls)

          for (const tc of toolCalls) {
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {}
            } catch (parseErr) {
              const m = (parseErr as Error).message
              enqueue({ type: 'error', message: `Failed to parse args for ${tc.name}: ${m}` })
              appendToolResultMessage(messages, tc.id, { error: 'invalid_arguments', raw: tc.arguments })
              continue
            }

            try {
              const toolResult = await executeToolCall(tc.name, parsedArgs)
              enqueue({
                type: 'tool',
                tool: tc.name,
                args: parsedArgs,
                result: toolResult,
              })
              appendToolResultMessage(messages, tc.id, toolResult)
            } catch (toolErr: any) {
              const errMsg = toolErr?.message || 'Tool execution failed'
              enqueue({ type: 'error', message: `${tc.name} failed: ${errMsg}` })
              appendToolResultMessage(messages, tc.id, { error: errMsg })
            }
          }
        }

        enqueue({ type: 'done' })
      } catch (err: any) {
        const errMsg = err?.message || 'Stream failed'
        enqueue({ type: 'error', message: errMsg })
      } finally {
        controller.close()
      }
    },
  })

  return sendStream(event, stream)
})

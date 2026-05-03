import OpenAI from 'openai'
import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import { useTqlKernel, pushMutationLog } from '../../plugins/tql'
import { emitMutation } from '../../utils/tql-events'
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
  const kernel = useTqlKernel()

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

const DEFAULT_TOKENROUTER_BASE_URL = 'https://api.tokenrouter.com/v1'
const MAX_TOOL_ROUNDS = 6

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { message, conversationId: _conversationId, userId, path } = body

  if (!message || !userId) {
    throw createError({ statusCode: 400, message: 'Missing message or userId' })
  }

  const apiKey = process.env.TOKENROUTER_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'TOKENROUTER_API_KEY not configured. Set it in your .env file.',
    })
  }

  // Normalize base URL: TokenRouter expects the OpenAI-compatible endpoints under /v1.
  // Accept either `https://api.tokenrouter.com` or `https://api.tokenrouter.com/v1`.
  const rawBaseURL = (process.env.TOKENROUTER_BASE_URL || DEFAULT_TOKENROUTER_BASE_URL).replace(/\/+$/, '')
  const baseURL = rawBaseURL.endsWith('/v1') ? rawBaseURL : `${rawBaseURL}/v1`

  // Routing: TOKENROUTER_MODEL env overrides classifier; else classify per-request.
  const routingDecision: RoutingDecision = resolveRoutingDecision(message, process.env.TOKENROUTER_MODEL)
  const model = routingDecision.model

  const systemInstruction = GRAPH_SYSTEM_PROMPT_TEMPLATE.replace('{{CURRENT_PATH}}', path || 'Unknown')

  // TokenRouter is OpenAI-compatible at /v1/chat/completions. Use the openai SDK
  // as a thin client by overriding baseURL.
  const client = new OpenAI({ apiKey, baseURL })

  // Conversation history accumulates across tool-call rounds.
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: message },
  ]

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
          router: 'tokenrouter',
          baseURL: baseURL.replace(/^https?:\/\//, ''),
          taskClass: routingDecision.taskClass,
          rationale: routingDecision.rationale,
        })

        // Multi-round tool-calling loop. Each round streams the model's response;
        // if it requests tools, we execute them, append the results, and loop.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let completionStream: AsyncIterable<ChatCompletionChunk>
          try {
            completionStream = (await client.chat.completions.create({
              model,
              messages,
              tools,
              stream: true,
            })) as unknown as AsyncIterable<ChatCompletionChunk>
          } catch (err: any) {
            // Surface upstream error body cleanly (TokenRouter returns OpenAI-shaped errors).
            const apiErr = err?.error ?? err?.response?.data?.error
            const surfaced = apiErr?.message || err?.message || 'Upstream request failed'
            const code = apiErr?.code || err?.status || ''
            enqueue({
              type: 'error',
              message: code ? `TokenRouter ${code}: ${surfaced}` : `TokenRouter: ${surfaced}`,
            })
            break
          }

          // Accumulate streamed text + tool-call deltas. OpenAI streams tool calls
          // piecewise (id/name/arguments arrive in fragments by index).
          let assistantContent = ''
          const toolCallsAcc: Record<number, { id: string; name: string; arguments: string }> = {}

          for await (const chunk of completionStream) {
            const choice = chunk.choices?.[0]
            if (!choice) continue
            const delta = choice.delta

            if (delta?.content) {
              assistantContent += delta.content
              enqueue({ type: 'text', content: delta.content })
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0
                if (!toolCallsAcc[idx]) {
                  toolCallsAcc[idx] = { id: '', name: '', arguments: '' }
                }
                if (tc.id) toolCallsAcc[idx]!.id = tc.id
                if (tc.function?.name) toolCallsAcc[idx]!.name = tc.function.name
                if (tc.function?.arguments) toolCallsAcc[idx]!.arguments += tc.function.arguments
              }
            }
          }

          const toolCalls = Object.values(toolCallsAcc).filter((tc) => tc.id && tc.name)

          // No tool calls this round → conversation complete.
          if (toolCalls.length === 0) break

          // Append assistant turn (with tool_calls) before executing.
          messages.push({
            role: 'assistant',
            content: assistantContent || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.arguments || '{}' },
            })),
          })

          // Execute each tool, stream result to client, append tool response message.
          for (const tc of toolCalls) {
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {}
            } catch (parseErr) {
              const m = (parseErr as Error).message
              enqueue({ type: 'error', message: `Failed to parse args for ${tc.name}: ${m}` })
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: 'invalid_arguments', raw: tc.arguments }),
              })
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
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(toolResult),
              })
            } catch (toolErr: any) {
              const errMsg = toolErr?.message || 'Tool execution failed'
              enqueue({ type: 'error', message: `${tc.name} failed: ${errMsg}` })
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: errMsg }),
              })
            }
          }
          // Loop continues — next iteration streams the model's synthesis of tool results.
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

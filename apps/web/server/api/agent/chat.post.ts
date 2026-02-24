import { GoogleGenerativeAI } from '@google/generative-ai'
import { useTqlKernel, pushMutationLog } from '../../plugins/tql'
import { emitMutation } from '../../utils/tql-events'

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

## Available Tools

- queryGraph(eqls) - Execute EQL-S queries to find entities
- getGraphSummary() - Get entity type counts and recent activity
- createEntity(type, data) - Create new entities in the graph
- updateEntity(id, data) - Update existing entities
- linkEntities(e1, relation, e2) - Create semantic links between entities

Always query the graph when users ask about their data. Don't make assumptions.`

const tools = [
  {
    name: 'queryGraph',
    description: 'Execute an EQL-S query against the TQL graph. Use this to find, filter, and analyze entities.',
    parameters: {
      type: 'object',
      properties: {
        eqls: {
          type: 'string',
          description: 'EQL-S query string. Example: "FIND entity AS ?e WHERE ?e.type = \'task\' AND ?e.taskStatus = \'pending\' RETURN ?e.title, ?e.priority"',
        },
      },
      required: ['eqls'],
    },
  },
  {
    name: 'getGraphSummary',
    description: 'Get a high-level overview of the graph: entity type counts, ontologies, recent mutations.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
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
  {
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
  {
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
      emitMutation({ action: 'link', entityId: `${args.e1} -> ${args.e2}`, agentId: 'agent', data: { relation: args.relation, e1: args.e1, e2: args.e2 } })
      return { linked: true }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { message, conversationId: _conversationId, userId, path } = body

  if (!message || !userId) {
    throw createError({ statusCode: 400, message: 'Missing message or userId' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'GEMINI_API_KEY not configured' })
  }

  const systemInstruction = GRAPH_SYSTEM_PROMPT_TEMPLATE.replace('{{CURRENT_PATH}}', path || 'Unknown')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction,
    tools: [{ functionDeclarations: tools }],
  })

  // Build chat history (simplified - in production, load from InstantDB)
  const chat = model.startChat({
    history: [],
  })

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        const result = await chat.sendMessageStream(message)

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) enqueue({ type: 'text', content: text })

          const functionCalls = chunk.functionCalls()
          if (functionCalls && functionCalls.length > 0) {
            for (const toolCall of functionCalls) {
              try {
                // Execute tool and send result
                const toolResult = await executeToolCall(toolCall.name, toolCall.args)
                enqueue({ type: 'tool', tool: toolCall.name, args: toolCall.args, result: toolResult })

                const followUp = await chat.sendMessageStream([
                  { functionResponse: { name: toolCall.name, response: toolResult } },
                ])

                for await (const followChunk of followUp.stream) {
                  const followText = followChunk.text()
                  if (followText) enqueue({ type: 'text', content: followText })
                }
              } catch (err: any) {
                enqueue({ type: 'error', message: `Tool failed: ${err.message}` })
              }
            }
          }
        }

        enqueue({ type: 'done' })
      } catch (err: any) {
        enqueue({ type: 'error', message: err.message || 'Stream failed' })
      } finally {
        controller.close()
      }
    },
  })

  return sendStream(event, stream)
})

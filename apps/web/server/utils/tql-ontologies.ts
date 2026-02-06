/**
 * TQL Ontology Definitions
 *
 * Defines the schema (ontology) for each entity type in the graph.
 * These are expressed as TQL SchemaDefinitions with Notion-compatible
 * property types. Each ontology maps 1:1 with an existing entity in
 * instant.schema.ts + calendarItem.ts.
 *
 * New entity types get their ontology added here when their page ships.
 */

import type { SchemaDefinition, WorkspaceConfig } from '@toolkit/tql'

// ============================================================================
// CalendarItem — polymorphic: task, event, payment, note, trip
// ============================================================================

const calendarItemOntology: SchemaDefinition = {
  '@id': 'trellis:schema/calendaritem',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  fields: [
    // Identity & type
    { name: 'type', valueType: 'select', required: true, selectOptions: ['task', 'event', 'trip', 'payment', 'note'] },
    { name: 'title', valueType: 'title', required: true },
    { name: 'description', valueType: 'rich_text' },

    // Scheduling
    { name: 'startDate', valueType: 'date', required: true },
    { name: 'endDate', valueType: 'date' },
    { name: 'allDay', valueType: 'checkbox' },
    { name: 'startTime', valueType: 'rich_text' },
    { name: 'endTime', valueType: 'rich_text' },

    // Classification
    { name: 'priority', valueType: 'select', selectOptions: ['critical', 'high', 'medium', 'low'] },
    { name: 'urgency', valueType: 'select', selectOptions: ['urgent', 'not-urgent'] },
    { name: 'priorityOverride', valueType: 'checkbox' },
    { name: 'urgencyOverride', valueType: 'checkbox' },
    { name: 'category', valueType: 'select', selectOptions: ['general', 'work', 'personal', 'meeting', 'review', 'appointment', 'deadline', 'health', 'finance', 'travel'] },
    { name: 'tags', valueType: 'multi_select' },

    // People
    { name: 'owner', valueType: 'rich_text' },
    { name: 'involved', valueType: 'multi_select' },

    // Organization — will become a relation in a future phase
    { name: 'folder', valueType: 'rich_text' },
    { name: 'notes', valueType: 'rich_text' },

    // Task-specific
    { name: 'taskStatus', valueType: 'select', selectOptions: ['pending', 'in-progress', 'on-track', 'due-soon', 'overdue', 'completed'] },

    // Event-specific
    { name: 'location', valueType: 'rich_text' },
    { name: 'conferenceLink', valueType: 'url' },
    { name: 'eventType', valueType: 'select', selectOptions: ['meeting', 'appointment', 'training', 'deadline', 'social', 'other'] },

    // Payment-specific
    { name: 'amount', valueType: 'number' },
    { name: 'currency', valueType: 'rich_text' },
    { name: 'payee', valueType: 'rich_text' },
    { name: 'paymentMethod', valueType: 'rich_text' },
    { name: 'recurring', valueType: 'checkbox' },
    { name: 'paymentStatus', valueType: 'select', selectOptions: ['pending', 'paid', 'overdue', 'cancelled'] },

    // Note-specific
    { name: 'content', valueType: 'rich_text' },
    { name: 'pinned', valueType: 'checkbox' },

    // Trip-specific
    { name: 'origin', valueType: 'rich_text' },
    { name: 'destination', valueType: 'rich_text' },
    { name: 'transportation', valueType: 'select', selectOptions: ['flight', 'drive', 'train', 'bus', 'other'] },
    { name: 'budget', valueType: 'number' },
    { name: 'confirmationNumber', valueType: 'rich_text' },
    { name: 'tripStatus', valueType: 'select', selectOptions: ['planning', 'booked', 'in-progress', 'completed', 'cancelled'] },
  ],
}

// ============================================================================
// Workspace Configuration — the .trellis format
// ============================================================================

export function createWorkspaceConfig(): WorkspaceConfig {
  return {
    workspace: {
      name: 'Trellis',
      description: 'Single graph, many projections — all app data as a graph.',
      ontologies: {
        'trellis:schema/calendaritem': calendarItemOntology,
      },
      projections: {
        'trellis:projection/all-tasks': {
          '@id': 'trellis:projection/all-tasks',
          '@type': 'trellis:Projection',
          name: 'All Tasks',
          type: 'table',
          query: 'FIND calendaritem AS ?t WHERE ?t.type = "task"',
        },
        'trellis:projection/all-events': {
          '@id': 'trellis:projection/all-events',
          '@type': 'trellis:Projection',
          name: 'All Events',
          type: 'table',
          query: 'FIND calendaritem AS ?e WHERE ?e.type = "event"',
        },
        'trellis:projection/all-notes': {
          '@id': 'trellis:projection/all-notes',
          '@type': 'trellis:Projection',
          name: 'All Notes',
          type: 'card-grid',
          query: 'FIND calendaritem AS ?n WHERE ?n.type = "note"',
        },
        'trellis:projection/all-payments': {
          '@id': 'trellis:projection/all-payments',
          '@type': 'trellis:Projection',
          name: 'All Payments',
          type: 'table',
          query: 'FIND calendaritem AS ?p WHERE ?p.type = "payment"',
        },
      },
    },
  }
}

export { calendarItemOntology }

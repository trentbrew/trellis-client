/**
 * Integration System Test Suite
 *
 * Tests the Google Calendar integration ontology system end-to-end:
 * - Integration ontology registration
 * - Seed data for integration definitions
 * - Integration connection CRUD
 * - GCal event sync entity creation
 * - Entity enrichment layer
 * - Read-only guard for synced events
 * - Server API endpoint validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { JsonlKernelBackend } from '../../packages/trellis-kernel/persist/jsonl-backend.js';
import { TrellisKernel } from '../../packages/trellis-kernel/kernel/trellis-kernel.js';
import { createWorkspaceConfig } from '../../apps/web/server/utils/trellis-ontologies';

// ── Helper: resolve query result ──────────────────────────────────────

function resolveQuery(kernel: TrellisKernel, eqls: string) {
  const result = kernel.query(eqls);
  return result instanceof Promise ? result : Promise.resolve(result);
}

// ── Test Suite ────────────────────────────────────────────────────────

describe('Integration Ontology System', () => {
  let tmpDir: string;
  let opsPath: string;
  let kernel: TrellisKernel;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tql-integration-test-'));
    opsPath = join(tmpDir, 'ops.jsonl');
    const backend = new JsonlKernelBackend({ filename: opsPath });
    kernel = new TrellisKernel({ backend, autoReplay: true });
    const config = createWorkspaceConfig();
    await kernel.boot(config);
  });

  afterEach(() => {
    kernel.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Ontology Registration ───────────────────────────────────────────

  describe('Ontology Registration', () => {
    it('registers integration_definition ontology', () => {
      const defSchema = kernel.getOntology('trellis:schema/integration_definition') as any;
      expect(defSchema).toBeDefined();
      expect(defSchema['@type']).toBe('trellis:Schema');
      expect(defSchema.tier).toBe('system');
    });

    it('registers integration_connection ontology', () => {
      const connSchema = kernel.getOntology('trellis:schema/integration_connection') as any;
      expect(connSchema).toBeDefined();
      expect(connSchema['@type']).toBe('trellis:Schema');
      expect(connSchema.tier).toBe('system');
    });

    it('integration_definition has expected fields', () => {
      const schema = kernel.getOntology('trellis:schema/integration_definition') as any;
      const fieldNames = schema.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('provider');
      expect(fieldNames).toContain('category');
      expect(fieldNames).toContain('authType');
      expect(fieldNames).toContain('features');
      expect(fieldNames).toContain('docsUrl');
      expect(fieldNames).toContain('webhookSupport');
      expect(fieldNames).toContain('enrichmentSupport');
      expect(fieldNames).toContain('syncDirection');
    });

    it('integration_connection has expected fields', () => {
      const schema = kernel.getOntology('trellis:schema/integration_connection') as any;
      const fieldNames = schema.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('integrationId');
      expect(fieldNames).toContain('userId');
      expect(fieldNames).toContain('connectionStatus');
      expect(fieldNames).toContain('syncEnabled');
      expect(fieldNames).toContain('accountEmail');
      expect(fieldNames).toContain('credentialsRef');
      expect(fieldNames).toContain('watchChannelId');
    });

    it('polymorphic entity ontology includes integration types', () => {
      const allSchemas = kernel.listOntologies() as any[];
      const entitySchema = allSchemas.find(
        (s) => s.fields?.some((f: any) => f.name === 'source'),
      );
      expect(entitySchema).toBeDefined();
      const typeField = entitySchema!.fields.find((f: any) => f.name === 'type');
      expect(typeField?.selectOptions).toContain('integration_definition');
      expect(typeField?.selectOptions).toContain('integration_connection');
    });

    it('polymorphic entity ontology includes GCal sync fields', () => {
      const allSchemas = kernel.listOntologies() as any[];
      const entitySchema = allSchemas.find(
        (s) => s.fields?.some((f: any) => f.name === 'source'),
      );
      expect(entitySchema).toBeDefined();
      const fieldNames = entitySchema!.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('source');
      expect(fieldNames).toContain('googleEventId');
      expect(fieldNames).toContain('googleCalendarId');
      expect(fieldNames).toContain('htmlLink');
      expect(fieldNames).toContain('gcalDeleted');
    });
  });

  // ── Integration Definition CRUD ─────────────────────────────────────

  describe('Integration Definition Seed & Query', () => {
    it('can seed an integration definition', async () => {
      await kernel.createNode('entity:integration-def-test', {
        type: 'integration_definition',
        title: 'Test Integration',
        provider: 'TestCo',
        category: 'data',
        authType: 'oauth',
        features: ['Feature A', 'Feature B'],
        integrationStatus: 'available',
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?i WHERE ?i.type = "integration_definition" AND ?i.title = "Test Integration" RETURN ?i.title, ?i.provider',
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!['?i.title']).toBe('Test Integration');
      expect(result.rows[0]!['?i.provider']).toBe('TestCo');
    });

    it('createNode is idempotent for same entity ID', async () => {
      await kernel.createNode('entity:integration-def-idem', {
        type: 'integration_definition',
        title: 'V1',
        provider: 'P',
        category: 'data',
        authType: 'none',
      }, 'entity');

      await kernel.createNode('entity:integration-def-idem', {
        type: 'integration_definition',
        title: 'V2',
        provider: 'P',
        category: 'data',
        authType: 'none',
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?i WHERE ?i.title = "V2" RETURN ?i.title',
      );
      expect(result.rows.length).toBe(1);

      const v1 = await resolveQuery(kernel,
        'FIND entity AS ?i WHERE ?i.title = "V1" RETURN ?i.title',
      );
      expect(v1.rows.length).toBe(0);
    });
  });

  // ── Integration Connection CRUD ─────────────────────────────────────

  describe('Integration Connection CRUD', () => {
    it('can create an integration connection', async () => {
      await kernel.createNode('entity:integration-conn-gcal-test', {
        type: 'integration_connection',
        title: 'Google Calendar (test@example.com)',
        integrationId: 'google-calendar',
        userId: 'user-123',
        connectionStatus: 'connected',
        syncEnabled: true,
        syncIntervalMs: 900000,
        accountEmail: 'test@example.com',
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?c WHERE ?c.type = "integration_connection" RETURN ?c.title, ?c.integrationId, ?c.connectionStatus',
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!['?c.integrationId']).toBe('google-calendar');
      expect(result.rows[0]!['?c.connectionStatus']).toBe('connected');
    });

    it('can update a connection status', async () => {
      await kernel.createNode('entity:conn-update-test', {
        type: 'integration_connection',
        title: 'Test Connection',
        integrationId: 'test',
        userId: 'user-1',
        connectionStatus: 'configuring',
      }, 'entity');

      await kernel.updateNode('entity:conn-update-test', {
        type: 'integration_connection',
        title: 'Test Connection',
        integrationId: 'test',
        userId: 'user-1',
        connectionStatus: 'connected',
        connectedAt: '2026-02-18T22:00:00Z',
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.connectionStatus = "connected" RETURN ?c.title',
      );
      expect(result.rows.length).toBe(1);
    });

    it('can delete a connection', async () => {
      await kernel.createNode('entity:conn-delete-test', {
        type: 'integration_connection',
        title: 'To Delete',
        integrationId: 'test',
        userId: 'user-1',
        connectionStatus: 'connected',
      }, 'entity');

      await kernel.deleteNode('entity:conn-delete-test');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?c WHERE ?c.title = "To Delete" RETURN ?c.title',
      );
      expect(result.rows.length).toBe(0);
    });
  });

  // ── GCal Event Sync ─────────────────────────────────────────────────

  describe('Google Calendar Event Sync', () => {
    it('can create a synced GCal event entity', async () => {
      await kernel.createNode('entity:gcal-abc123', {
        type: 'event',
        title: 'Team Standup',
        description: 'Daily standup meeting',
        startDate: '2026-02-18',
        endDate: '2026-02-18',
        startTime: '09:00',
        endTime: '09:30',
        allDay: false,
        location: 'Zoom',
        tags: ['google-calendar'],
        source: 'google-calendar',
        googleEventId: 'abc123',
        googleCalendarId: 'primary',
        htmlLink: 'https://calendar.google.com/event?eid=abc123',
        googleStatus: 'confirmed',
        gcalDeleted: false,
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.type = "event" AND ?e.source = "google-calendar" RETURN ?e.title, ?e.googleEventId',
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!['?e.title']).toBe('Team Standup');
      expect(result.rows[0]!['?e.googleEventId']).toBe('abc123');
    });

    it('re-syncing overwrites GCal event data (idempotent)', async () => {
      await kernel.createNode('entity:gcal-resync', {
        type: 'event',
        title: 'Meeting v1',
        source: 'google-calendar',
        googleEventId: 'resync-1',
        startDate: '2026-02-18',
      }, 'entity');

      await kernel.createNode('entity:gcal-resync', {
        type: 'event',
        title: 'Meeting v2 (updated)',
        source: 'google-calendar',
        googleEventId: 'resync-1',
        startDate: '2026-02-19',
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.googleEventId = "resync-1" RETURN ?e.title, ?e.startDate',
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!['?e.title']).toBe('Meeting v2 (updated)');
      expect(result.rows[0]!['?e.startDate']).toBe('2026-02-19');
    });

    it('can soft-delete a GCal event on sync', async () => {
      await kernel.createNode('entity:gcal-softdel', {
        type: 'event',
        title: 'Cancelled Meeting',
        source: 'google-calendar',
        googleEventId: 'softdel-1',
        startDate: '2026-02-18',
        gcalDeleted: false,
      }, 'entity');

      await kernel.updateNode('entity:gcal-softdel', {
        type: 'event',
        title: 'Cancelled Meeting',
        source: 'google-calendar',
        googleEventId: 'softdel-1',
        startDate: '2026-02-18',
        gcalDeleted: true,
      }, 'entity');

      const result = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.googleEventId = "softdel-1" RETURN ?e.gcalDeleted',
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!['?e.gcalDeleted']).toBe(true);
    });
  });

  // ── Enrichment Layer ────────────────────────────────────────────────

  describe('Entity Enrichment Layer', () => {
    it('can create an enrichment node linked to a GCal event', async () => {
      // Create the GCal event
      await kernel.createNode('entity:gcal-enrich-src', {
        type: 'event',
        title: 'Client Call',
        source: 'google-calendar',
        googleEventId: 'enrich-1',
        startDate: '2026-02-20',
      }, 'entity');

      // Create the enrichment node
      await kernel.createNode('entity:gcal-enrich-enrich-1', {
        type: 'event',
        title: 'Enrichment: enrich-1',
        source: 'google-calendar-enrichment',
        googleEventId: 'enrich-1',
        priority: 'high',
        tags: ['client', 'important'],
        category: 'work',
      }, 'entity');

      // Link them
      await kernel.link('entity:gcal-enrich-src', 'enrichedBy', 'entity:gcal-enrich-enrich-1');

      // Verify enrichment node exists
      const enrichResult = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.source = "google-calendar-enrichment" RETURN ?e.priority, ?e.category',
      );
      expect(enrichResult.rows.length).toBe(1);
      expect(enrichResult.rows[0]!['?e.priority']).toBe('high');
      expect(enrichResult.rows[0]!['?e.category']).toBe('work');
    });

    it('re-syncing the GCal event does NOT affect enrichment node', async () => {
      // Create both nodes
      await kernel.createNode('entity:gcal-preserve-src', {
        type: 'event',
        title: 'Original Title',
        source: 'google-calendar',
        googleEventId: 'preserve-1',
        startDate: '2026-03-01',
      }, 'entity');

      await kernel.createNode('entity:gcal-enrich-preserve-1', {
        type: 'event',
        title: 'Enrichment: preserve-1',
        source: 'google-calendar-enrichment',
        googleEventId: 'preserve-1',
        priority: 'critical',
        tags: ['vip'],
      }, 'entity');

      // Re-sync the GCal event (overwrites gcal-preserve-src)
      await kernel.createNode('entity:gcal-preserve-src', {
        type: 'event',
        title: 'Updated Title from Google',
        source: 'google-calendar',
        googleEventId: 'preserve-1',
        startDate: '2026-03-02',
      }, 'entity');

      // Enrichment node should be untouched
      const enrichResult = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.source = "google-calendar-enrichment" AND ?e.googleEventId = "preserve-1" RETURN ?e.priority, ?e.tags',
      );
      expect(enrichResult.rows.length).toBe(1);
      expect(enrichResult.rows[0]!['?e.priority']).toBe('critical');
    });
  });

  // ── Query Patterns ──────────────────────────────────────────────────

  describe('Query Patterns', () => {
    it('can query all integration definitions by category', async () => {
      await kernel.createNode('entity:def-cat-a', {
        type: 'integration_definition', title: 'A', provider: 'P', category: 'data', authType: 'oauth',
      }, 'entity');
      await kernel.createNode('entity:def-cat-b', {
        type: 'integration_definition', title: 'B', provider: 'P', category: 'communication', authType: 'webhook',
      }, 'entity');
      await kernel.createNode('entity:def-cat-c', {
        type: 'integration_definition', title: 'C', provider: 'P', category: 'data', authType: 'api_key',
      }, 'entity');

      const dataResult = await resolveQuery(kernel,
        'FIND entity AS ?i WHERE ?i.type = "integration_definition" AND ?i.category = "data" RETURN ?i.title',
      );
      expect(dataResult.rows.length).toBe(2);

      const commResult = await resolveQuery(kernel,
        'FIND entity AS ?i WHERE ?i.type = "integration_definition" AND ?i.category = "communication" RETURN ?i.title',
      );
      expect(commResult.rows.length).toBe(1);
    });

    it('can query connections by status', async () => {
      await kernel.createNode('entity:conn-status-a', {
        type: 'integration_connection', title: 'A', integrationId: 'x', userId: 'u1', connectionStatus: 'connected',
      }, 'entity');
      await kernel.createNode('entity:conn-status-b', {
        type: 'integration_connection', title: 'B', integrationId: 'y', userId: 'u1', connectionStatus: 'error',
      }, 'entity');

      const connected = await resolveQuery(kernel,
        'FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.connectionStatus = "connected" RETURN ?c.title',
      );
      expect(connected.rows.length).toBe(1);
      expect(connected.rows[0]!['?c.title']).toBe('A');
    });

    it('can filter GCal events from all events client-side', async () => {
      // Simulate the actual composable pattern: query event IDs by type,
      // then fetch full nodes via getNode and filter client-side by source.
      await kernel.createNode('entity:gcal-filter-test', {
        type: 'event', title: 'GCal Event', startDate: '2026-02-18', source: 'google-calendar', googleEventId: 'gf-1',
      }, 'entity');
      await kernel.createNode('entity:local-event-1', {
        type: 'event', title: 'Local Event', startDate: '2026-02-18',
      }, 'entity');

      // Step 1: Query all event entity IDs (no RETURN of source — avoids attribute resolver issue)
      const idResult = await resolveQuery(kernel,
        'FIND entity AS ?e WHERE ?e.type = "event"',
      );
      expect(idResult.rows.length).toBe(2);

      // Step 2: Fetch full nodes (simulates fetchNodes in the composable)
      const ids = idResult.rows.map((r: any) => r['?e'] as string);
      const nodes = ids.map((id: string) => {
        const facts = kernel.getStore().getFactsByEntity(id);
        const obj: Record<string, any> = { '@id': id };
        for (const f of facts) obj[f.a] = f.v;
        return obj;
      });
      expect(nodes.length).toBe(2);

      // Step 3: Client-side filter for GCal events
      const gcalEvents = nodes.filter((n) => n.source === 'google-calendar');
      expect(gcalEvents.length).toBe(1);
      expect(gcalEvents[0]!.title).toBe('GCal Event');
    });
  });
});

// ── Server API Tests (curl-based, require running server) ─────────────

describe('Integration Server API (requires running dev server)', () => {
  const BASE = 'http://localhost:1414';

  // Helper: check if server is running
  async function isServerUp(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/api/graph/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  it('GET /api/graph/health returns ok', async () => {
    if (!(await isServerUp())) {
      console.log('⏭️  Skipping server test — dev server not running');
      return;
    }
    const res = await fetch(`${BASE}/api/graph/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.factCount).toBeGreaterThan(0);
  });

  it('GET /api/graph/ontologies includes integration schemas', async () => {
    if (!(await isServerUp())) return;
    const res = await fetch(`${BASE}/api/graph/ontologies`);
    const data = await res.json();
    const keys = Object.keys(data.ontologies || {});
    expect(keys).toContain('trellis:schema/integration_definition');
    expect(keys).toContain('trellis:schema/integration_connection');
  });

  it('POST /api/graph/query returns seeded integration definitions', async () => {
    if (!(await isServerUp())) return;
    const res = await fetch(`${BASE}/api/graph/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'FIND entity AS ?i WHERE ?i.type = "integration_definition" RETURN ?i.title, ?i.category',
      }),
    });
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(4);
    const titles = data.data.map((r: any) => r['?i.title']);
    expect(titles).toContain('Google Calendar');
    expect(titles).toContain('Notion');
    expect(titles).toContain('Slack');
    expect(titles).toContain('GitHub');
  });

  it('GET /api/integrations/google-calendar/auth redirects to Google consent screen', async () => {
    if (!(await isServerUp())) return;
    const res = await fetch(`${BASE}/api/integrations/google-calendar/auth`, {
      redirect: 'manual',
    });
    // With GOOGLE_CLIENT_ID set and redirect URI auto-derived, should 302 to Google
    expect(res.status).toBe(302);
    const location = res.headers.get('location') || '';
    expect(location).toContain('accounts.google.com/o/oauth2');
    expect(location).toContain('calendar.readonly');
  });

  it('POST /api/integrations/google-calendar/revoke rejects missing connectionId', async () => {
    if (!(await isServerUp())) return;
    const res = await fetch(`${BASE}/api/integrations/google-calendar/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/integrations/google-calendar/events rejects missing connectionId', async () => {
    if (!(await isServerUp())) return;
    const res = await fetch(`${BASE}/api/integrations/google-calendar/events`);
    expect(res.status).toBe(400);
  });
});

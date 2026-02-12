import { randomUUID } from 'crypto';
import type { Fact, Link, Atom, QueryTraceEntry } from '../store/eav-store.js';
import { EAVStore, jsonEntityFacts } from '../store/eav-store.js';
import { DatalogEvaluator } from '../query/datalog-evaluator.js';
import type { Query, Binding } from '../query/datalog-evaluator.js';
import { EQLSProcessor } from '../query/eqls-parser.js';
import type { KernelBackend, KernelOp } from '../persist/backend.js';
import type { KernelMiddleware, MiddlewareContext } from './middleware.js';
import type { NLQueryOptions } from './ai-interop.js';
import { createOp } from './operations.js';
import {
  type WorkspaceConfig,
  type SchemaDefinition,
  type ProjectionDefinition,
  WorkspaceConfigSchema,
} from './workspace.js';
import { CORE_ONTOLOGY } from './core-ontology.js';
import type { SyncProvider } from './sync.js';
import { jsonEntityFactsWithExpr } from '../computation/index.js';

// Helper function to singularize a word (basic English pluralization)
// Returns the original word if it doesn't match common plural patterns
function singularize(word: string): string {
  const lowerWord = word.toLowerCase();

  // Check for common irregular plurals first
  const irregularPlurals: Record<string, string> = {
    people: 'person',
    men: 'man',
    women: 'woman',
    children: 'child',
    teeth: 'tooth',
    feet: 'foot',
    mice: 'mouse',
    geese: 'goose',
    oxen: 'ox',
    dice: 'die',
    lice: 'louse',
    stimuli: 'stimulus',
    cacti: 'cactus',
    foci: 'focus',
    radii: 'radius',
    alumni: 'alumnus',
    fungi: 'fungus',
    nuclei: 'nucleus',
    analyses: 'analysis',
    diagnoses: 'diagnosis',
    oases: 'oasis',
    theses: 'thesis',
    crises: 'crisis',
    phenomena: 'phenomenon',
    criteria: 'criterion',
    data: 'datum',
    bacteria: 'bacterium',
    curricula: 'curriculum',
  };

  if (irregularPlurals[lowerWord]) {
    return irregularPlurals[lowerWord];
  }

  // Words that don't change in plural form (unchangeables)
  const unchangeables = new Set([
    'sheep',
    'fish',
    'deer',
    'series',
    'species',
    'money',
    'aircraft',
    'bison',
    'cod',
    'moose',
    'salmon',
    'swine',
    'trout',
    'offspring',
    'means',
    'species',
    'series',
  ]);
  if (unchangeables.has(lowerWord)) {
    return word;
  }

  // Check for common plural patterns
  if (lowerWord.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (lowerWord.endsWith('ves')) {
    return word.slice(0, -3) + 'f';
  }
  if (lowerWord.endsWith('ses') || lowerWord.endsWith('xes')) {
    return word.slice(0, -2);
  }

  // Only singularize if it's a very clear plural pattern (ends with 's' and is a common word)
  // Otherwise, use the key as-is to support custom entity names
  const commonPlurals = [
    'users',
    'products',
    'tasks',
    'items',
    'orders',
    'posts',
    'events',
    'projects',
    'transactions',
  ];
  if (commonPlurals.includes(lowerWord)) {
    return word.slice(0, -1);
  }

  // For compound words ending in 'ies' (like customEntities), singularize properly
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';
  }

  // For compound words ending in 's' (like customEntities), remove 's'
  // but only if the word before 's' looks like a valid singular
  if (word.endsWith('s') && word.length > 3) {
    const singular = word.slice(0, -1);
    // Don't singularize if it would create an invalid word (e.g., 'customEntitie')
    if (!singular.endsWith('ie') && !singular.endsWith('e')) {
      return singular;
    }
  }

  // Return original word if no clear pattern matched
  return word;
}

// Helper function to detect ID key from an object
function detectIdKey(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  const idKeys = ['id', '_id', 'uuid', 'key', 'slug'];
  for (const key of idKeys) {
    if (key in obj) return key;
  }
  return undefined;
}

export type TrellisKernelQueryResult = {
  rows: Record<string, unknown>[];
  executionTime: number;
  plan?: string;
  bindings?: Binding[]; // Raw Datalog bindings
  trace?: QueryTraceEntry[];
};

export type TrellisKernelOptions = {
  store?: EAVStore;
  backend?: KernelBackend;
  autoReplay?: boolean;
  middleware?: KernelMiddleware[];
  sync?: SyncProvider;
  enableExprEvaluation?: boolean; // Enable @expr field evaluation
};

const stableCompare = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  return String(a).localeCompare(String(b));
};

export class TrellisKernel {
  private store: EAVStore;
  private evaluator: DatalogEvaluator;
  private eqls: EQLSProcessor;
  private backend?: KernelBackend;
  private middleware: KernelMiddleware[] = [];
  private sync?: SyncProvider;
  private opened = false;

  // Declarative workspace state
  private ontologies: Map<string, SchemaDefinition> = new Map();
  private projections: Map<string, ProjectionDefinition> = new Map();

  // Computation options
  private enableExprEvaluation: boolean;

  constructor();
  constructor(store?: EAVStore);
  constructor(opts?: TrellisKernelOptions);
  constructor(storeOrOpts?: EAVStore | TrellisKernelOptions) {
    const opts: TrellisKernelOptions =
      storeOrOpts instanceof EAVStore
        ? { store: storeOrOpts }
        : (storeOrOpts ?? {});

    this.store = opts.store ?? new EAVStore();
    this.evaluator = new DatalogEvaluator(this.store);
    this.eqls = new EQLSProcessor();
    this.backend = opts.backend;
    this.middleware = opts.middleware ?? [];
    this.sync = opts.sync;
    this.enableExprEvaluation = opts.enableExprEvaluation ?? true;

    // Set up sync subscription
    if (this.sync) {
      this.sync.onRemoteOp(async (op) => {
        await this.applyRemoteOperation(op);
      });
    }

    // Auto-load core ontology (immutable, kernel-owned)
    for (const schema of CORE_ONTOLOGY) {
      this.ontologies.set(schema['@id'], schema);
    }

    const autoReplay = opts.autoReplay ?? true;
    if (this.backend && autoReplay) {
      this.open();
    }
  }

  open(): void {
    if (!this.backend || this.opened) return;
    this.backend.init();

    // 1. Try to load latest snapshot
    const snapshot = this.backend.loadLatestSnapshot();
    let ops: KernelOp[] = [];

    if (snapshot) {
      // Restore store state from snapshot
      this.store.restore(snapshot.data);
      // Only read operations that happened after this snapshot
      ops = this.backend.readAfter(snapshot.lastOpHash);
    } else {
      // No snapshot, read all operations from the beginning
      ops = this.backend.readAll();
    }

    // 2. Replay operations into the store
    for (const op of ops) {
      this.applyOp(op, { system: true });
    }

    this.opened = true;
  }

  /**
   * Persists a snapshot of the current kernel state to the backend.
   * This speeds up future boot times by reducing the number of operations to replay.
   */
  async checkpoint(): Promise<void> {
    if (!this.backend) return;
    const lastOp = this.backend.getLastOp();
    if (!lastOp) return;

    const snapshotData = this.store.snapshot();
    this.backend.saveSnapshot(lastOp.hash, snapshotData);
  }

  close(): void {
    this.backend?.close?.();
  }

  getStore(): EAVStore {
    return this.store;
  }

  /**
   * Boots the kernel with data or a full workspace configuration.
   */
  async boot(
    data: unknown,
    opts?: {
      rootEntityId?: string;
      rootEntityType?: string;
      entityType?: string;
      idKey?: string;
    },
  ): Promise<void> {
    if (this.backend) {
      this.open();
    }

    // Check if this is a WorkspaceConfig
    const wsParse = WorkspaceConfigSchema.safeParse(data);
    if (wsParse.success) {
      const config = wsParse.data;
      await this.bootWorkspace(config);
      return;
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as any;
      if (Array.isArray(obj['@graph'])) {
        const graph = obj['@graph'] as any[];
        const results: Promise<void>[] = [];

        for (let i = 0; i < graph.length; i++) {
          const node = graph[i];
          if (!node || typeof node !== 'object' || Array.isArray(node))
            continue;

          const entityId = node['@id'] ?? `node:${i}`;
          const rawType = node['@type'];
          const entityType =
            typeof rawType === 'string'
              ? rawType
              : Array.isArray(rawType) && typeof rawType[0] === 'string'
                ? rawType[0]
                : (opts?.entityType ?? 'default');

          const nodeData = { ...node };
          delete (nodeData as any)['@id'];
          delete (nodeData as any)['@type'];

          for (const key of Object.keys(nodeData)) {
            if (key.startsWith('@')) {
              delete (nodeData as any)[key];
            }
          }

          const facts = this.enableExprEvaluation
            ? jsonEntityFactsWithExpr(entityId, nodeData, entityType)
            : jsonEntityFacts(entityId, nodeData, entityType);

          results.push(this.appendFacts(facts));
        }

        await Promise.all(results);
        this.eqls.setSchema(this.store.getCatalog());
        return;
      }
    }

    // Common case: array of items (one entity per item)
    if (Array.isArray(data)) {
      const entityType = opts?.entityType ?? 'item';
      const idKey = opts?.idKey ?? 'id';

      const results: Promise<void>[] = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i] as any;
        const idVal =
          item && typeof item === 'object' ? item[idKey] : undefined;
        const entityId = `${entityType}:${idVal ?? i}`;

        // Use jsonEntityFactsWithExpr if @expr evaluation is enabled
        const facts = this.enableExprEvaluation
          ? jsonEntityFactsWithExpr(entityId, item, entityType)
          : jsonEntityFacts(entityId, item, entityType);

        results.push(this.appendFacts(facts));
      }

      await Promise.all(results);
      this.eqls.setSchema(this.store.getCatalog());
      return;
    }

    // Handle object with array properties (multi-entity dataset)
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const arrayKeys = Object.keys(data).filter(
        (key) => !key.startsWith('@') && Array.isArray((data as any)[key]),
      );
      const nonArrayKeys = Object.keys(data).filter(
        (key) =>
          !key.startsWith('@') &&
          !Array.isArray((data as any)[key]) &&
          typeof (data as any)[key] === 'object' &&
          !('@expr' in (data as any)[key]), // Exclude computed fields
      );

      if (arrayKeys.length > 0 || nonArrayKeys.length > 0) {
        // Boot each array with inferred entity type
        for (const arrayKey of arrayKeys) {
          const arrayData = (data as any)[arrayKey] as any[];
          if (arrayData.length === 0) continue;

          // Infer entity type from array key
          const entityType = opts?.entityType ?? singularize(arrayKey);

          // Detect ID key from first item
          const firstItem = arrayData[0];
          let idKey = opts?.idKey;
          if (!idKey && firstItem && typeof firstItem === 'object') {
            idKey = detectIdKey(firstItem);
          }

          // Boot the array
          await this.boot(arrayData, { entityType, idKey });
        }

        // Boot each non-array object as a single entity
        for (const objectKey of nonArrayKeys) {
          const objectData = (data as any)[objectKey];
          if (!objectData || typeof objectData !== 'object') continue;

          // Use the key as the entity type
          const entityType = opts?.entityType ?? objectKey;

          // Detect ID key
          let idKey = opts?.idKey;
          if (!idKey) {
            idKey = detectIdKey(objectData);
          }

          // Boot the single object as an entity
          await this.boot(objectData, { entityType, idKey });
        }

        // Boot root entity if there are root-level computed fields
        const hasRootComputedFields = Object.keys(data).some(
          (key) =>
            !key.startsWith('@') &&
            typeof (data as any)[key] === 'object' &&
            !Array.isArray((data as any)[key]) &&
            '@expr' in (data as any)[key],
        );

        if (hasRootComputedFields) {
          const rootEntityId = opts?.rootEntityId ?? 'root';
          const rootEntityType = opts?.rootEntityType ?? 'root';

          // Build evaluation context with arrays for computed field evaluation
          const evaluationContext: Record<string, any> = {};
          for (const arrayKey of arrayKeys) {
            evaluationContext[arrayKey] = (data as any)[arrayKey];
          }

          const facts = this.enableExprEvaluation
            ? jsonEntityFactsWithExpr(rootEntityId, data, rootEntityType, {
                evaluationContext,
              })
            : jsonEntityFacts(rootEntityId, data, rootEntityType);
          await this.appendFacts(facts);
        }

        this.eqls.setSchema(this.store.getCatalog());
        return;
      }
    }

    // Default: treat as a single root object
    const rootEntityId = opts?.rootEntityId ?? 'root';
    // Use provided entity type or default to 'root'
    const rootEntityType = opts?.entityType ?? opts?.rootEntityType ?? 'root';

    // Use jsonEntityFactsWithExpr if @expr evaluation is enabled
    const facts = this.enableExprEvaluation
      ? jsonEntityFactsWithExpr(rootEntityId, data, rootEntityType)
      : jsonEntityFacts(rootEntityId, data, rootEntityType);
    await this.appendFacts(facts);
    this.eqls.setSchema(this.store.getCatalog());
  }

  /**
   * Processes a full WorkspaceConfig (.trellis format)
   */
  private async bootWorkspace(config: WorkspaceConfig): Promise<void> {
    const ws = config.workspace;

    // 1. Load Ontologies from code config
    if (ws.ontologies) {
      for (const [id, schema] of Object.entries(ws.ontologies)) {
        this.ontologies.set(id, schema);
      }
    }

    // 2. Load Projections
    if (ws.projections) {
      for (const [id, projection] of Object.entries(ws.projections)) {
        this.projections.set(id, projection);
      }
    }

    // 3. Load Graph Data (Nodes & Edges)
    if (ws.graph) {
      const mutationPromises: Promise<void>[] = [];

      if (ws.graph.nodes) {
        for (const node of ws.graph.nodes) {
          const entityId = node['@id'] || `node:${randomUUID()}`;
          const type = node['@type'] || 'default';
          mutationPromises.push(this.createNode(entityId, node, type));
        }
      }

      if (ws.graph.edges) {
        for (const edge of ws.graph.edges) {
          const source = edge.source?.['@id'] || edge.source;
          const target = edge.target?.['@id'] || edge.target;
          const relation = edge.relationType || edge.relation;
          if (source && target && relation) {
            mutationPromises.push(this.link(source, relation, target));
          }
        }
      }

      await Promise.all(mutationPromises);
    }

    // 4. Hydrate persisted ontologies from EAV facts (merges with code config)
    this.hydrateOntologiesFromFacts();

    // Refresh EQLS schema from catalog after data ingest
    this.eqls.setSchema(this.store.getCatalog());
  }

  /**
   * Gets a defined projection by ID.
   */
  getProjection(id: string): ProjectionDefinition | undefined {
    return this.projections.get(id);
  }

  /**
   * Lists all defined projections.
   */
  listProjections(): ProjectionDefinition[] {
    return Array.from(this.projections.values());
  }

  /**
   * Gets a defined ontology by ID.
   */
  getOntology(id: string): SchemaDefinition | undefined {
    return this.ontologies.get(id);
  }

  /**
   * Lists all registered ontologies.
   */
  listOntologies(): SchemaDefinition[] {
    return Array.from(this.ontologies.values());
  }

  /**
   * Creates a new ontology and persists it as EAV facts.
   * Throws if an ontology with the same ID already exists.
   */
  async createOntology(
    schema: SchemaDefinition,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    if (this.ontologies.has(schema['@id'])) {
      const existing = this.ontologies.get(schema['@id']);
      if (existing?.tier === 'core') {
        throw new Error(`Cannot create ontology: ${schema['@id']} is a core type (immutable)`);
      }
      throw new Error(`Ontology already exists: ${schema['@id']}`);
    }
    this.ontologies.set(schema['@id'], schema);
    await this.persistOntology(schema, ctx);
  }

  /**
   * Updates an existing ontology, replacing old EAV facts with new ones.
   * Throws if the ontology does not exist.
   */
  async updateOntology(
    schema: SchemaDefinition,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    if (!this.ontologies.has(schema['@id'])) {
      throw new Error(`Ontology not found: ${schema['@id']}`);
    }
    const current = this.ontologies.get(schema['@id']);
    if (current?.tier === 'core') {
      throw new Error(`Cannot update ontology: ${schema['@id']} is a core type (immutable)`);
    }
    // Delete old facts then write new
    const entityId = this.ontologyEntityId(schema['@id']);
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate('deleteFacts', { facts: existing }, ctx);
    }
    this.ontologies.set(schema['@id'], schema);
    await this.persistOntology(schema, ctx);
  }

  /**
   * Deletes an ontology from the in-memory map and removes its EAV facts.
   * Throws if the ontology does not exist.
   */
  async deleteOntology(
    id: string,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    if (!this.ontologies.has(id)) {
      throw new Error(`Ontology not found: ${id}`);
    }
    const current = this.ontologies.get(id);
    if (current?.tier === 'core') {
      throw new Error(`Cannot delete ontology: ${id} is a core type (immutable)`);
    }
    const entityId = this.ontologyEntityId(id);
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate('deleteFacts', { facts: existing }, ctx);
    }
    this.ontologies.delete(id);
  }

  /**
   * Returns only core ontologies (tier: 'core').
   */
  getCoreOntologies(): SchemaDefinition[] {
    return Array.from(this.ontologies.values()).filter(s => s.tier === 'core');
  }

  /**
   * Converts an ontology @id to an EAV entity ID for persistence.
   */
  private ontologyEntityId(id: string): string {
    return `ontology:${id.replace(/[/:]/g, '_')}`;
  }

  /**
   * Persists a SchemaDefinition as EAV facts.
   */
  private async persistOntology(
    schema: SchemaDefinition,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    const entityId = this.ontologyEntityId(schema['@id']);
    const data = {
      type: 'trellis:Schema',
      schemaId: schema['@id'],
      version: schema.version,
      fields: JSON.stringify(schema.fields),
    };
    const facts = jsonEntityFacts(entityId, data, 'trellis:Schema');
    await this._mutate('addFacts', { facts }, ctx);
  }

  /**
   * Hydrates ontologies from persisted EAV facts (called during boot).
   * Looks for entities of type 'trellis:Schema' and reconstructs SchemaDefinitions.
   */
  private hydrateOntologiesFromFacts(): void {
    const allFacts = this.store.getAllFacts();
    const schemaEntities = new Map<string, Record<string, any>>();

    for (const fact of allFacts) {
      if (!fact.e.startsWith('ontology:')) continue;
      if (!schemaEntities.has(fact.e)) {
        schemaEntities.set(fact.e, {});
      }
      const entity = schemaEntities.get(fact.e)!;
      entity[fact.a] = fact.v;
    }

    for (const [, attrs] of schemaEntities) {
      if (attrs.type !== 'trellis:Schema' || !attrs.schemaId) continue;
      try {
        const schema: SchemaDefinition = {
          '@id': attrs.schemaId,
          '@type': 'trellis:Schema',
          version: attrs.version || '1.0.0',
          fields: typeof attrs.fields === 'string' ? JSON.parse(attrs.fields) : (attrs.fields || []),
        };
        // Only hydrate if not already loaded from code config
        if (!this.ontologies.has(schema['@id'])) {
          this.ontologies.set(schema['@id'], schema);
        }
      } catch {
        // Skip malformed persisted ontologies
      }
    }
  }

  /**
   * Exports the current kernel state as a full WorkspaceConfig.
   */
  async exportWorkspace(): Promise<WorkspaceConfig> {
    const ontologies: Record<string, SchemaDefinition> = {};
    for (const [id, schema] of this.ontologies.entries()) {
      ontologies[id] = schema;
    }

    const projections: Record<string, ProjectionDefinition> = {};
    for (const [id, proj] of this.projections.entries()) {
      projections[id] = proj;
    }

    // Reconstruct nodes from facts
    const nodes: any[] = [];
    const entities = new Set<string>();
    for (const fact of this.store.getAllFacts()) {
      if (fact) entities.add(fact.e);
    }

    for (const entityId of entities) {
      const facts = this.store.getFactsByEntity(entityId);
      const node: any = { '@id': entityId };
      for (const f of facts) {
        if (f.a === 'type') {
          node['@type'] = f.v;
        } else {
          node[f.a] = f.v;
        }
      }
      nodes.push(node);
    }

    // Reconstruct edges from links
    const edges: any[] = [];
    for (const link of this.store.getAllLinks()) {
      edges.push({
        source: { '@id': link.e1 },
        target: { '@id': link.e2 },
        relationType: link.a,
      });
    }

    return {
      workspace: {
        ontologies: Object.keys(ontologies).length > 0 ? ontologies : undefined,
        projections:
          Object.keys(projections).length > 0 ? projections : undefined,
        graph: {
          nodes: nodes.length > 0 ? nodes : undefined,
          edges: edges.length > 0 ? edges : undefined,
        },
      },
    };
  }

  /**
   * Executes a pre-defined projection by its ID.
   */
  async executeProjection(
    id: string,
    ctx: MiddlewareContext = {},
  ): Promise<TrellisKernelQueryResult> {
    const projection = this.getProjection(id);
    if (!projection) {
      throw new Error(`Projection ${id} not found`);
    }

    // Projections can be EQL-S strings or Datalog Query objects (though defined as string in schema)
    // For now, we treat them as EQL-S.
    return this.query(projection.query, ctx);
  }

  private async appendFacts(
    facts: ReturnType<typeof jsonEntityFacts>,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    const lastOp = this.backend?.getLastOp();
    const op = await createOp('addFacts', {
      agentId: ctx.agentId || 'system',
      facts,
      previousHash: lastOp?.hash,
    });

    if (this.backend) {
      this.open();
      this.backend.append(op);
    }
    return this.applyOp(op, ctx);
  }

  private applyOp(
    op: KernelOp,
    ctx: MiddlewareContext = {},
  ): void | Promise<void> {
    // Run middleware
    const runMiddleware = (index: number): void | Promise<void> => {
      if (index >= this.middleware.length) {
        // Final action: update store
        if (op.kind === 'addFacts' && op.facts) {
          this.store.addFacts(op.facts);
        } else if (op.kind === 'addLinks' && op.links) {
          this.store.addLinks(op.links);
        } else if (op.kind === 'deleteFacts' && op.facts) {
          this.store.deleteFacts(op.facts);
        } else if (op.kind === 'deleteLinks' && op.links) {
          this.store.deleteLinks(op.links);
        }
        return;
      }

      const mw = this.middleware[index];
      if (mw && mw.handleOp) {
        return mw.handleOp(op, ctx, (nextOp, nextCtx) =>
          runMiddleware(index + 1),
        );
      } else {
        return runMiddleware(index + 1);
      }
    };

    return runMiddleware(0);
  }

  /**
   * Performs a mutation on the kernel state by applying an operation.
   * Operations are passed through middleware and persisted to the backend.
   */
  async mutate(op: KernelOp, ctx: MiddlewareContext = {}): Promise<void> {
    if (this.backend) {
      this.open();
      this.backend.append(op);
    }
    await this.applyOp(op, ctx);

    // Broadcast to peers if sync is enabled and this is a local operation
    if (this.sync && !ctx.remote && !ctx.system) {
      await this.sync.broadcast(op);
    }
  }

  /**
   * Applies an operation from a remote source (e.g. sync).
   * Persists the operation locally and updates the store.
   */
  async applyRemoteOperation(
    op: KernelOp,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    return this.mutate(op, { ...ctx, remote: true });
  }

  /**
   * Internal helper to create and apply an operation.
   */
  private async _mutate(
    kind: KernelOp['kind'],
    params: { facts?: any[]; links?: any[] },
    ctx: MiddlewareContext,
  ): Promise<void> {
    const lastOp = this.backend?.getLastOp();
    const op = await createOp(kind, {
      agentId: ctx.agentId || 'system',
      facts: params.facts,
      links: params.links,
      previousHash: lastOp?.hash,
    });
    return this.mutate(op, ctx);
  }

  /**
   * High-level CRUD: Create a new node from a JSON object.
   */
  async createNode(
    entityId: string,
    data: any,
    type: string,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    // Idempotent: remove any pre-existing facts for this entity to prevent
    // duplicate fact accumulation if createNode is called more than once
    // with the same entityId.
    const existing = this.store.getFactsByEntity(entityId);
    if (existing.length > 0) {
      await this._mutate('deleteFacts', { facts: existing }, ctx);
    }

    // Use jsonEntityFactsWithExpr if @expr evaluation is enabled
    const facts = this.enableExprEvaluation
      ? jsonEntityFactsWithExpr(entityId, data, type)
      : jsonEntityFacts(entityId, data, type);
    await this._mutate('addFacts', { facts }, ctx);
  }

  /**
   * High-level CRUD: Update an existing node (overwrites all existing facts for this entity).
   */
  async updateNode(
    entityId: string,
    data: any,
    type: string,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    // 1. Get existing facts
    const existingFacts = this.store.getFactsByEntity(entityId);
    if (existingFacts.length > 0) {
      await this._mutate('deleteFacts', { facts: existingFacts }, ctx);
    }

    // 2. Add new facts (with @expr evaluation if enabled)
    const facts = this.enableExprEvaluation
      ? jsonEntityFactsWithExpr(entityId, data, type)
      : jsonEntityFacts(entityId, data, type);
    await this._mutate('addFacts', { facts }, ctx);
  }

  /**
   * High-level CRUD: Delete all facts for an entity.
   */
  async deleteNode(
    entityId: string,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    const facts = this.store.getFactsByEntity(entityId);
    if (facts.length > 0) {
      await this._mutate('deleteFacts', { facts }, ctx);
    }
  }

  /**
   * High-level CRUD: Create a link between two nodes.
   */
  async link(
    e1: string,
    a: string,
    e2: string,
    ctx: MiddlewareContext = {},
  ): Promise<void> {
    await this._mutate('addLinks', { links: [{ e1, a, e2 }] }, ctx);
  }

  query(
    eqlsQuery: string,
    ctx: MiddlewareContext = {},
  ): TrellisKernelQueryResult | Promise<TrellisKernelQueryResult> {
    return this.runQueryMiddleware(eqlsQuery, ctx);
  }

  /**
   * Evaluates a natural language query by translating it to EQL-S first.
   */
  async queryNatural(
    nl: string,
    opts: NLQueryOptions,
  ): Promise<TrellisKernelQueryResult> {
    const eqlsQuery = await opts.provider.translate(nl, opts.context);
    return this.query(eqlsQuery, opts.context);
  }

  /**
   * Directly executes a Datalog query against the kernel.
   * This bypasses the EQL-S parser and compiler.
   */
  async queryDatalog(
    query: Query,
    ctx: MiddlewareContext = {},
  ): Promise<TrellisKernelQueryResult> {
    return this.runQueryMiddleware(query, ctx);
  }

  private runQueryMiddleware(
    query: string | Query,
    ctx: MiddlewareContext,
  ): TrellisKernelQueryResult | Promise<TrellisKernelQueryResult> {
    if (this.backend) {
      this.open();
    }

    const runMiddleware = (
      index: number,
      currentQuery: string | Query,
      currentCtx: MiddlewareContext,
    ): TrellisKernelQueryResult | Promise<TrellisKernelQueryResult> => {
      if (index >= this.middleware.length) {
        // Handle time-travel (ephemeral snapshot)
        if (this.backend && (currentCtx.atHash || currentCtx.atTimestamp)) {
          const ephemeralStore = new EAVStore();
          const ops = currentCtx.atHash
            ? this.backend.readUntil(currentCtx.atHash as string)
            : this.backend.readUntilTimestamp(currentCtx.atTimestamp as string);

          for (const op of ops) {
            if (op.kind === 'addFacts' && op.facts) {
              ephemeralStore.addFacts(op.facts);
            } else if (op.kind === 'addLinks' && op.links) {
              ephemeralStore.addLinks(op.links);
            } else if (op.kind === 'deleteFacts' && op.facts) {
              ephemeralStore.deleteFacts(op.facts);
            } else if (op.kind === 'deleteLinks' && op.links) {
              ephemeralStore.deleteLinks(op.links);
            }
          }

          return this.executeBaseQuery(currentQuery, ephemeralStore);
        }

        return this.executeBaseQuery(currentQuery);
      }

      const mw = this.middleware[index];
      if (mw && mw.handleQuery) {
        return mw.handleQuery(currentQuery, currentCtx, (q, c) =>
          runMiddleware(index + 1, q, c),
        );
      } else {
        return runMiddleware(index + 1, currentQuery, currentCtx);
      }
    };

    return runMiddleware(0, query, ctx);
  }

  private executeBaseQuery(
    queryOrEqls: string | Query,
    storeOverride?: EAVStore,
  ): TrellisKernelQueryResult {
    const store = storeOverride || this.store;
    const evaluator = storeOverride
      ? new DatalogEvaluator(storeOverride)
      : this.evaluator;

    // Keep schema in sync with the current store contents
    this.eqls.setSchema(store.getCatalog());

    if (typeof queryOrEqls !== 'string') {
      const exec = evaluator.evaluate(queryOrEqls);
      return {
        rows: exec.bindings as Record<string, unknown>[],
        executionTime: exec.executionTime,
        plan: exec.plan,
        bindings: exec.bindings,
      };
    }

    const processed = this.eqls.process(queryOrEqls);
    if (processed.errors.length > 0 || !processed.query) {
      const message = processed.errors.map((e) => e.message).join('; ');
      throw new Error(message || 'Query parsing failed');
    }

    const compiledQueries =
      processed.queries && processed.queries.length > 0
        ? processed.queries
        : [processed.query];

    const projectionMap = processed.projectionMap || new Map<string, string>();

    const mergedRows: Record<string, unknown>[] = [];
    const seen = new Set<string>();

    let totalTime = 0;
    const plans: string[] = [];
    const allTraces: QueryTraceEntry[] = [];

    for (const q of compiledQueries) {
      const exec = evaluator.evaluate(q);
      totalTime += exec.executionTime;
      if (exec.plan) plans.push(exec.plan);
      if (exec.trace) allTraces.push(...exec.trace);

      for (const binding of exec.bindings) {
        const row: Record<string, unknown> =
          projectionMap.size === 0
            ? (binding as unknown as Record<string, unknown>)
            : (() => {
                const projected: Record<string, unknown> = {};
                for (const [field, varName] of projectionMap.entries()) {
                  projected[field] = (binding as any)[varName];
                }
                return projected;
              })();

        const k = JSON.stringify(row);
        if (!seen.has(k)) {
          seen.add(k);
          mergedRows.push(row);
        }
      }
    }

    // Apply ORDER BY / LIMIT in-kernel (query-level semantics)
    const orderBy = processed.meta?.orderBy;
    if (orderBy?.field) {
      const dir = orderBy.direction === 'DESC' ? -1 : 1;
      mergedRows.sort(
        (ra, rb) =>
          dir *
          stableCompare((ra as any)[orderBy.field], (rb as any)[orderBy.field]),
      );
    }

    const limit = processed.meta?.limit;
    const finalRows =
      typeof limit === 'number' && limit >= 0
        ? mergedRows.slice(0, limit)
        : mergedRows;

    return {
      rows: finalRows,
      executionTime: totalTime,
      plan: plans.length > 0 ? plans.join(' | ') : undefined,
      trace: allTraces.length > 0 ? allTraces : undefined,
    };
  }
}

import { d as defineEventHandler, e as useTqlKernel, c as createError, i as getZoneGuardStats, j as getZoneGuardMode, k as parseApiQuery, l as getMutationLog, m as useWorkspaceConfig, v as validateApiInput, G as GraphNodeParamsSchema, n as parseApiBody, z as zoneFromRequest, o as getHeader, q as checkMutation, p as pushMutationLog, f as emitMutation, t as GraphOntologyParamsSchema, r as readBody, w as getRequestURL, x as shouldCaptureDecision, y as captureDecision, A as GraphSummaryQuerySchema, B as GraphNodesBodySchema, C as GraphQueryBodySchema, D as GraphMutateBodySchema, E as GraphOntologyCreateBodySchema, F as GraphOntologyUpdateBodySchema, H as GraphOntologyDeleteBodySchema, I as recordStrictRejection } from '../../../nitro/nitro.mjs';
import 'zod';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'better-sqlite3';
import 'crypto';
import '@google/generative-ai';
import 'node:vm';
import '@instantdb/admin';
import 'node:url';
import '@iconify/utils';
import 'consola';

function factsToNode(entityId, facts) {
  const node = { "@id": entityId };
  const attrCounts = {};
  for (const fact of facts) {
    attrCounts[fact.a] = (attrCounts[fact.a] || 0) + 1;
  }
  for (const fact of facts) {
    if (fact.a === "type") {
      node["@type"] = fact.v;
    } else if (attrCounts[fact.a] > 1) {
      if (!Array.isArray(node[fact.a])) {
        node[fact.a] = [];
      }
      node[fact.a].push(fact.v);
    } else {
      node[fact.a] = fact.v;
    }
  }
  return node;
}
const ____path_ = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
  let kernel;
  try {
    kernel = useTqlKernel();
  } catch {
    throw createError({ statusCode: 503, message: "TQL kernel not initialized" });
  }
  const method = event.method;
  const path = ((_a = event.context.params) == null ? void 0 : _a.path) || "";
  const segments = path.split("/").filter(Boolean);
  const route = segments[0] || "";
  if (method === "GET" && route === "health") {
    const store = kernel.getStore();
    let factCount = 0;
    for (const _ of store.getAllFacts()) factCount++;
    let linkCount = 0;
    for (const _ of store.getAllLinks()) linkCount++;
    return {
      status: "ok",
      factCount,
      linkCount,
      zoneGuard: { mode: getZoneGuardMode(), ...getZoneGuardStats() }
    };
  }
  if (method === "GET" && route === "summary") {
    const store = kernel.getStore();
    const { limit } = parseApiQuery(event, GraphSummaryQuerySchema);
    let factCount = 0;
    for (const _ of store.getAllFacts()) factCount++;
    let linkCount = 0;
    for (const _ of store.getAllLinks()) linkCount++;
    const typeCounts = {};
    const entityIds = /* @__PURE__ */ new Set();
    for (const fact of store.getAllFacts()) {
      if (fact.a === "type" && fact.e.startsWith("entity:")) {
        typeCounts[String(fact.v)] = (typeCounts[String(fact.v)] || 0) + 1;
        entityIds.add(fact.e);
      }
    }
    const entityTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([type, count]) => ({ type, count }));
    const allOntologies = kernel.listOntologies();
    const systemOntologies = [];
    const userOntologies = [];
    for (const schema of allOntologies) {
      const shortId = schema["@id"].replace(/^(trellis:schema\/|core:)/, "");
      if ((schema == null ? void 0 : schema.tier) === "user") {
        userOntologies.push(shortId);
      } else if ((schema == null ? void 0 : schema.tier) !== "core") {
        systemOntologies.push(shortId);
      }
    }
    const catalog = store.getCatalog() || [];
    const SKIP_ATTRS = /* @__PURE__ */ new Set(["@id", "@type", "id"]);
    const topAttributes = catalog.filter((c) => !SKIP_ATTRS.has(c.attribute)).sort((a, b) => b.distinctCount - a.distinctCount).slice(0, limit).map((c) => ({ attribute: c.attribute, distinctCount: c.distinctCount, cardinality: c.cardinality }));
    const relations = /* @__PURE__ */ new Set();
    for (const link of store.getAllLinks()) relations.add(link.a);
    const recentMutations = getMutationLog().slice().reverse().slice(0, 5).map((m) => ({ action: m.action, entityId: m.entityId, timestamp: m.timestamp }));
    return {
      health: { status: "ok", factCount, linkCount, entityCount: entityIds.size },
      entityTypes,
      ontologies: {
        total: allOntologies.length,
        system: systemOntologies,
        user: userOntologies
      },
      topAttributes,
      links: { total: linkCount, relations: [...relations] },
      recentMutations
    };
  }
  if (method === "GET" && (route === "ontologies" || route === "schema")) {
    const ontologies = {};
    for (const schema of kernel.listOntologies()) {
      ontologies[schema["@id"]] = schema;
    }
    return { ontologies };
  }
  if (method === "GET" && route === "config") {
    const wsConfig = useWorkspaceConfig();
    const ontologies = {};
    for (const schema of kernel.listOntologies()) {
      ontologies[schema["@id"]] = schema;
    }
    const projections = {};
    for (const proj of kernel.listProjections()) {
      projections[proj["@id"]] = proj;
    }
    return {
      app: wsConfig.workspace.app || null,
      routes: wsConfig.workspace.routes || {},
      projections,
      ontologies
    };
  }
  if (method === "GET" && route === "catalog") {
    const store = kernel.getStore();
    return {
      catalog: store.getCatalog()
    };
  }
  if (method === "GET" && route === "projections") {
    return {
      projections: kernel.listProjections()
    };
  }
  if (method === "GET" && route === "node") {
    const { entityId } = validateApiInput(GraphNodeParamsSchema, { entityId: segments.slice(1).join("/") }, "params");
    const store = kernel.getStore();
    const facts = store.getFactsByEntity(entityId);
    if (facts.length === 0) {
      throw createError({ statusCode: 404, message: `Entity not found: ${entityId}` });
    }
    const node = factsToNode(entityId, facts);
    const links = store.getAllLinks();
    const outgoing = [];
    const incoming = [];
    for (const link of links) {
      if (link.e1 === entityId) {
        outgoing.push({ relation: link.a, target: link.e2 });
      }
      if (link.e2 === entityId) {
        incoming.push({ relation: link.a, source: link.e1 });
      }
    }
    return {
      node,
      links: { outgoing, incoming }
    };
  }
  if (method === "GET" && route === "log") {
    return { entries: getMutationLog().slice().reverse() };
  }
  if (method === "POST" && route === "checkpoint") {
    try {
      await kernel.checkpoint();
      return { ok: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
    } catch (err) {
      throw createError({ statusCode: 500, message: (err == null ? void 0 : err.message) || "checkpoint failed" });
    }
  }
  if (method === "POST" && route === "nodes") {
    const { ids } = await parseApiBody(event, GraphNodesBodySchema);
    const store = kernel.getStore();
    const nodes = [];
    const allLinks = store.getAllLinks();
    const outgoingByEntity = /* @__PURE__ */ new Map();
    const incomingByEntity = /* @__PURE__ */ new Map();
    for (const link of allLinks) {
      if (!outgoingByEntity.has(link.e1)) outgoingByEntity.set(link.e1, []);
      outgoingByEntity.get(link.e1).push({ relation: link.a, target: link.e2 });
      if (!incomingByEntity.has(link.e2)) incomingByEntity.set(link.e2, []);
      incomingByEntity.get(link.e2).push({ relation: link.a, source: link.e1 });
    }
    for (const entityId of ids) {
      const facts = store.getFactsByEntity(entityId);
      if (facts.length > 0) {
        const node = factsToNode(entityId, facts);
        node._links = {
          outgoing: outgoingByEntity.get(entityId) || [],
          incoming: incomingByEntity.get(entityId) || []
        };
        nodes.push(node);
      }
    }
    return { nodes };
  }
  if (method === "POST" && route === "query") {
    const { query, projection } = await parseApiBody(event, GraphQueryBodySchema);
    if (projection) {
      try {
        const result = await kernel.executeProjection(projection);
        return { data: result.rows, meta: { executionTime: result.executionTime, plan: result.plan } };
      } catch (err) {
        throw createError({ statusCode: 400, message: err.message });
      }
    }
    try {
      if (!query) {
        throw createError({
          statusCode: 400,
          message: 'Request body must include "query" (EQL-S string) or "projection" (projection ID)'
        });
      }
      const result = await kernel.query(query);
      return {
        data: result.rows,
        meta: {
          executionTime: result.executionTime,
          plan: result.plan,
          trace: result.trace
        }
      };
    } catch (err) {
      throw createError({ statusCode: 400, message: err.message });
    }
  }
  if (method === "POST" && route === "mutate") {
    const body = await parseApiBody(event, GraphMutateBodySchema);
    const { action, entityId, data, type, e1, relation, e2, agentId } = body;
    const agent = agentId || "browser";
    const { zoneId, facilityId } = zoneFromRequest(event);
    const captureHeader = getHeader(event, "x-trellis-capture-decision");
    const captureRequested = captureHeader === "1" || captureHeader === "true" || (body == null ? void 0 : body.captureDecision) === true;
    if (getZoneGuardMode() === "strict" && action) {
      const { decision } = checkMutation(kernel, { action, agentId: agent, zoneId });
      if (!decision.allowed) {
        recordStrictRejection();
        console.warn(
          `[zone-guard] REJECT (strict) agent=${agent} action=${action} zone=${zoneId} reason="${decision.reason}"`
        );
        throw createError({
          statusCode: 403,
          statusMessage: "Forbidden",
          message: `Zone guard denied ${action} in ${zoneId}: ${decision.reason}`,
          data: { zoneId, facilityId, reason: decision.reason, mode: "strict" }
        });
      }
    }
    const maybeCapture = async (targetEntityId, targetType) => {
      const input = {
        action,
        agentId: agent,
        zoneId,
        facilityId,
        entityId: targetEntityId,
        entityType: targetType,
        toolInput: { action, entityId: targetEntityId, type: targetType, e1, relation, e2 }
      };
      if (!shouldCaptureDecision(input, captureRequested)) return;
      await captureDecision(kernel, input);
    };
    try {
      switch (action) {
        case "createNode": {
          const nodeData = data || {};
          if (!nodeData.ownerId) {
            nodeData.ownerId = agent;
          }
          if (!nodeData.owner) {
            nodeData.owner = agent;
          }
          if (!nodeData.zoneId) {
            nodeData.zoneId = zoneId;
          }
          if (!nodeData.facilityId) {
            nodeData.facilityId = facilityId;
          }
          await kernel.createNode(entityId, nodeData, type, { agentId: agent });
          pushMutationLog({ action: "createNode", entityId, type, agentId: agent, zoneId, facilityId, data: nodeData });
          emitMutation({ action: "createNode", entityId, type, agentId: agent, zoneId, facilityId, data: nodeData });
          await maybeCapture(entityId, typeof nodeData.type === "string" ? nodeData.type : void 0);
          return { ok: true, entityId };
        }
        case "updateNode": {
          const updateData = data || {};
          if (!updateData.ownerId) {
            updateData.ownerId = agent;
          }
          if (!updateData.owner) {
            updateData.owner = agent;
          }
          await kernel.updateNode(entityId, updateData, type, { agentId: agent });
          pushMutationLog({
            action: "updateNode",
            entityId,
            type,
            agentId: agent,
            zoneId,
            facilityId,
            data: updateData
          });
          emitMutation({ action: "updateNode", entityId, type, agentId: agent, zoneId, facilityId, data: updateData });
          return { ok: true, entityId };
        }
        case "deleteNode": {
          await kernel.deleteNode(entityId, { agentId: agent });
          pushMutationLog({ action: "deleteNode", entityId, agentId: agent, zoneId, facilityId });
          emitMutation({ action: "deleteNode", entityId, agentId: agent, zoneId, facilityId });
          await maybeCapture(entityId, void 0);
          return { ok: true, entityId };
        }
        case "link": {
          await kernel.link(e1, relation, e2, { agentId: agent });
          pushMutationLog({
            action: "link",
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation }
          });
          emitMutation({
            action: "link",
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation, e1, e2 }
          });
          await maybeCapture(`${e1} -> ${e2}`, void 0);
          return { ok: true, e1, relation, e2 };
        }
        case "unlink": {
          await kernel.unlink(e1, relation, e2, { agentId: agent });
          pushMutationLog({
            action: "unlink",
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation }
          });
          emitMutation({
            action: "unlink",
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation, e1, e2 }
          });
          await maybeCapture(`${e1} -> ${e2}`, void 0);
          return { ok: true, e1, relation, e2 };
        }
        default:
          throw createError({ statusCode: 400, message: `Unknown action: ${action}` });
      }
    } catch (err) {
      if (err.statusCode) throw err;
      throw createError({ statusCode: 500, message: err.message });
    }
  }
  if (method === "GET" && route === "ontology") {
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join("/")) },
      "params"
    );
    const schema = kernel.getOntology(ontologyId);
    if (!schema) {
      throw createError({ statusCode: 404, message: `Ontology not found: ${ontologyId}` });
    }
    return { ontology: schema };
  }
  if (method === "POST" && route === "ontology") {
    const { schema, agentId } = await parseApiBody(event, GraphOntologyCreateBodySchema);
    const agent = agentId || "browser";
    const normalizedSchema = { ...schema, "@type": "trellis:Schema" };
    try {
      await kernel.createOntology(normalizedSchema, { agentId: agent });
      pushMutationLog({
        action: "createOntology",
        entityId: normalizedSchema["@id"],
        data: { version: normalizedSchema.version }
      });
      emitMutation({
        action: "createOntology",
        entityId: normalizedSchema["@id"],
        type: "ontology",
        agentId: agent,
        data: normalizedSchema
      });
      return { ok: true, id: normalizedSchema["@id"] };
    } catch (err) {
      throw createError({ statusCode: 409, message: err.message });
    }
  }
  if (method === "PUT" && route === "ontology") {
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join("/")) },
      "params"
    );
    const { schema, agentId } = await parseApiBody(event, GraphOntologyUpdateBodySchema);
    const agent = agentId || "browser";
    const normalizedSchema = { ...schema, "@id": ontologyId, "@type": "trellis:Schema" };
    const fieldNames = normalizedSchema.fields.map((f) => f.name);
    const dupes = fieldNames.filter((n, i) => fieldNames.indexOf(n) !== i);
    if (dupes.length > 0) {
      throw createError({ statusCode: 409, message: `Duplicate field name(s): ${dupes.join(", ")}` });
    }
    try {
      await kernel.updateOntology(normalizedSchema, { agentId: agent });
      pushMutationLog({ action: "updateOntology", entityId: ontologyId, data: { version: normalizedSchema.version } });
      emitMutation({
        action: "updateOntology",
        entityId: ontologyId,
        type: "ontology",
        agentId: agent,
        data: normalizedSchema
      });
      return { ok: true, id: ontologyId };
    } catch (err) {
      if (err.message.includes("not found")) {
        throw createError({ statusCode: 404, message: err.message });
      }
      throw createError({ statusCode: 500, message: err.message });
    }
  }
  if (method === "DELETE" && route === "ontology") {
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join("/")) },
      "params"
    );
    const { agentId } = await parseApiBody(event, GraphOntologyDeleteBodySchema);
    const agent = agentId || "browser";
    try {
      await kernel.deleteOntology(ontologyId, { agentId: agent });
      pushMutationLog({ action: "deleteOntology", entityId: ontologyId });
      emitMutation({ action: "deleteOntology", entityId: ontologyId, type: "ontology", agentId: agent });
      return { ok: true, id: ontologyId };
    } catch (err) {
      if (err.message.includes("not found")) {
        throw createError({ statusCode: 404, message: err.message });
      }
      throw createError({ statusCode: 500, message: err.message });
    }
  }
  if (method === "POST" && route === "backfill-integration-edges") {
    const body = await readBody(event).catch(() => ({}));
    const agent = (body == null ? void 0 : body.agentId) || "backfill";
    const dryRun = !!(body == null ? void 0 : body.dryRun);
    const store = kernel.getStore();
    const SOURCE_TO_INTEGRATION = {
      "google-calendar": "google-calendar",
      "google-calendar-enrichment": "google-calendar",
      gmail: "gmail"
    };
    const connByIntegration = /* @__PURE__ */ new Map();
    const factsByEntity = /* @__PURE__ */ new Map();
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, []);
      factsByEntity.get(fact.e).push({ a: fact.a, v: fact.v });
    }
    for (const [entityId, facts] of factsByEntity) {
      const isConn = facts.some((f) => f.a === "type" && f.v === "integration_connection");
      if (!isConn) continue;
      const integrationId = String(((_b = facts.find((f) => f.a === "integrationId")) == null ? void 0 : _b.v) || "");
      if (!integrationId) continue;
      const status = String(((_c = facts.find((f) => f.a === "connectionStatus")) == null ? void 0 : _c.v) || "configuring");
      if (!connByIntegration.has(integrationId)) connByIntegration.set(integrationId, []);
      connByIntegration.get(integrationId).push({ id: entityId, status });
    }
    const defaultsFromBody = (body == null ? void 0 : body.defaultByIntegration) || {};
    const singleConn = /* @__PURE__ */ new Map();
    for (const [integrationId, conns] of connByIntegration) {
      if (defaultsFromBody[integrationId]) {
        singleConn.set(integrationId, defaultsFromBody[integrationId]);
        continue;
      }
      const connected = conns.filter((c) => c.status === "connected");
      if (connected.length === 1) singleConn.set(integrationId, connected[0].id);
      else if (conns.length === 1) singleConn.set(integrationId, conns[0].id);
    }
    const allConnIds = /* @__PURE__ */ new Set();
    for (const conns of connByIntegration.values()) {
      for (const c of conns) allConnIds.add(c.id);
    }
    const existingDerivedFrom = /* @__PURE__ */ new Map();
    for (const link of store.getAllLinks()) {
      if (link.a !== "derivedFrom") continue;
      if (!existingDerivedFrom.has(link.e1)) existingDerivedFrom.set(link.e1, /* @__PURE__ */ new Set());
      existingDerivedFrom.get(link.e1).add(link.e2);
    }
    const byIntegration = {};
    let totalLinked = 0;
    let totalAlreadyLinked = 0;
    let totalNoConnection = 0;
    let totalAmbiguous = 0;
    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith("entity:")) continue;
      const sourceFact = facts.find((f) => f.a === "source");
      if (!sourceFact) continue;
      const source = String(sourceFact.v);
      const integrationId = SOURCE_TO_INTEGRATION[source];
      if (!integrationId) continue;
      const bucket = byIntegration[integrationId] || (byIntegration[integrationId] = {
        linked: 0,
        alreadyLinked: 0,
        noConnection: 0,
        ambiguous: 0
      });
      const attrConnId = (_d = facts.find((f) => f.a === "connectionId")) == null ? void 0 : _d.v;
      let connId;
      if (attrConnId && allConnIds.has(attrConnId)) {
        connId = attrConnId;
      } else if (singleConn.has(integrationId)) {
        connId = singleConn.get(integrationId);
      }
      if (!connId) {
        const connCount = ((_e = connByIntegration.get(integrationId)) == null ? void 0 : _e.length) || 0;
        if (connCount === 0) {
          bucket.noConnection++;
          totalNoConnection++;
        } else {
          bucket.ambiguous++;
          totalAmbiguous++;
        }
        continue;
      }
      if ((_f = existingDerivedFrom.get(entityId)) == null ? void 0 : _f.has(connId)) {
        bucket.alreadyLinked++;
        totalAlreadyLinked++;
        continue;
      }
      if (!dryRun) {
        try {
          await kernel.link(entityId, "derivedFrom", connId, { agentId: agent });
          emitMutation({
            action: "link",
            entityId: `${entityId} -> ${connId}`,
            agentId: agent,
            data: { relation: "derivedFrom", e1: entityId, e2: connId }
          });
        } catch (err) {
          console.error(`[backfill] link failed for ${entityId} -> ${connId}:`, err.message);
          continue;
        }
      }
      bucket.linked++;
      totalLinked++;
    }
    pushMutationLog({
      action: "backfill-integration-edges",
      data: {
        linked: totalLinked,
        alreadyLinked: totalAlreadyLinked,
        noConnection: totalNoConnection,
        ambiguous: totalAmbiguous,
        dryRun
      }
    });
    return {
      ok: true,
      dryRun,
      totals: {
        linked: totalLinked,
        alreadyLinked: totalAlreadyLinked,
        noConnection: totalNoConnection,
        ambiguous: totalAmbiguous
      },
      byIntegration,
      connectionsByIntegration: Object.fromEntries(
        Array.from(connByIntegration.entries()).map(([k, v]) => [k, v.map((c) => ({ id: c.id, status: c.status }))])
      ),
      autoResolved: Object.fromEntries(singleConn),
      hint: totalAmbiguous > 0 ? 'Some entities could not be linked because multiple connections exist for their integration and they have no `connectionId` attribute. Pass `defaultByIntegration: { "<integrationId>": "<connection entity id>" }` in the body to resolve them, or re-sync from each connection so the sync code writes the attribute.' : void 0
    };
  }
  if (method === "POST" && route === "backfill-gcal-attribution") {
    const body = await readBody(event).catch(() => ({}));
    const agent = (body == null ? void 0 : body.agentId) || "backfill-gcal";
    const dryRun = !!(body == null ? void 0 : body.dryRun);
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1e3;
    const timeMin = (body == null ? void 0 : body.timeMin) || new Date(Date.now() - twoYearsMs).toISOString();
    const timeMax = (body == null ? void 0 : body.timeMax) || new Date(Date.now() + twoYearsMs).toISOString();
    const store = kernel.getStore();
    const gcalConns = [];
    const factsByEntity = /* @__PURE__ */ new Map();
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, []);
      factsByEntity.get(fact.e).push({ a: fact.a, v: fact.v });
    }
    for (const [entityId, facts] of factsByEntity) {
      if (!facts.some((f) => f.a === "type" && f.v === "integration_connection")) continue;
      const integrationId = String(((_g = facts.find((f) => f.a === "integrationId")) == null ? void 0 : _g.v) || "");
      if (integrationId !== "google-calendar") continue;
      const status = String(((_h = facts.find((f) => f.a === "connectionStatus")) == null ? void 0 : _h.v) || "");
      if (status !== "connected") continue;
      const email = String(((_i = facts.find((f) => f.a === "accountEmail")) == null ? void 0 : _i.v) || "");
      gcalConns.push({ entityId, email });
    }
    if (gcalConns.length === 0) {
      return { ok: true, dryRun, message: "No connected google-calendar connections found.", linked: 0 };
    }
    const eventOwnership = /* @__PURE__ */ new Map();
    const perConnection = {};
    const connByEmail = /* @__PURE__ */ new Map();
    for (const c of gcalConns) {
      if (c.email) connByEmail.set(c.email.toLowerCase(), c.entityId);
    }
    for (const conn of gcalConns) {
      const connReport = perConnection[conn.entityId] = {
        calendarsScanned: 0,
        eventsFetched: 0,
        ownedByOrganizer: 0
      };
      try {
        const calList = await $fetch(
          `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&listCalendars=true`
        );
        const calendars = calList.items || [];
        connReport.calendarsScanned = calendars.length;
        for (const cal of calendars) {
          if (!cal.id) continue;
          try {
            const eventsResp = await $fetch(
              `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
            );
            const items = eventsResp.items || [];
            connReport.eventsFetched += items.length;
            for (const evt of items) {
              if (!evt.id) continue;
              const organizerEmail = (_k = (_j = evt.organizer) == null ? void 0 : _j.email) == null ? void 0 : _k.toLowerCase();
              const organizerConnId = organizerEmail ? connByEmail.get(organizerEmail) : void 0;
              const isOrganizerMatch = organizerConnId === conn.entityId;
              const existing = eventOwnership.get(evt.id);
              if (!existing) {
                eventOwnership.set(evt.id, {
                  connEntityId: organizerConnId || conn.entityId,
                  byOrganizer: !!organizerConnId,
                  conflicts: []
                });
                if (isOrganizerMatch) connReport.ownedByOrganizer++;
              } else {
                if (existing.connEntityId !== conn.entityId && !existing.conflicts.includes(conn.entityId)) {
                  existing.conflicts.push(conn.entityId);
                }
                if (isOrganizerMatch && !existing.byOrganizer) {
                  existing.connEntityId = conn.entityId;
                  existing.byOrganizer = true;
                  connReport.ownedByOrganizer++;
                }
              }
            }
          } catch (err) {
            console.warn(
              `[backfill-gcal] Failed calendar ${cal.id} on ${conn.entityId}:`,
              (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message)
            );
          }
        }
      } catch (err) {
        connReport.error = (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message) || "Unknown error";
        console.error(`[backfill-gcal] Connection ${conn.entityId} failed:`, connReport.error);
      }
    }
    const existingDerivedFrom = /* @__PURE__ */ new Map();
    for (const link of store.getAllLinks()) {
      if (link.a !== "derivedFrom") continue;
      if (!existingDerivedFrom.has(link.e1)) existingDerivedFrom.set(link.e1, /* @__PURE__ */ new Set());
      existingDerivedFrom.get(link.e1).add(link.e2);
    }
    let linked = 0;
    let alreadyLinked = 0;
    let attrUpdated = 0;
    let attributedByOrganizer = 0;
    let attributedByFirstWins = 0;
    let notFoundInGoogle = 0;
    let conflicted = 0;
    const sampleNotFound = [];
    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith("entity:")) continue;
      const source = (_l = facts.find((f) => f.a === "source")) == null ? void 0 : _l.v;
      if (source !== "google-calendar") continue;
      const googleEventId = (_m = facts.find((f) => f.a === "googleEventId")) == null ? void 0 : _m.v;
      if (!googleEventId) continue;
      const ownership = eventOwnership.get(googleEventId);
      if (!ownership) {
        notFoundInGoogle++;
        if (sampleNotFound.length < 5) sampleNotFound.push(entityId);
        continue;
      }
      if (ownership.conflicts.length > 0) conflicted++;
      if (ownership.byOrganizer) attributedByOrganizer++;
      else attributedByFirstWins++;
      const targetConn = ownership.connEntityId;
      const currentAttr = (_n = facts.find((f) => f.a === "connectionId")) == null ? void 0 : _n.v;
      if (currentAttr !== targetConn) {
        if (!dryRun) {
          try {
            await kernel.updateNode(entityId, { connectionId: targetConn }, "entity", { agentId: agent });
          } catch (err) {
            console.error(`[backfill-gcal] updateNode failed for ${entityId}:`, err.message);
          }
        }
        attrUpdated++;
      }
      if ((_o = existingDerivedFrom.get(entityId)) == null ? void 0 : _o.has(targetConn)) {
        alreadyLinked++;
        continue;
      }
      if (!dryRun) {
        try {
          await kernel.link(entityId, "derivedFrom", targetConn, { agentId: agent });
          emitMutation({
            action: "link",
            entityId: `${entityId} -> ${targetConn}`,
            agentId: agent,
            data: { relation: "derivedFrom", e1: entityId, e2: targetConn }
          });
        } catch (err) {
          console.error(`[backfill-gcal] link failed for ${entityId} -> ${targetConn}:`, err.message);
          continue;
        }
      }
      linked++;
    }
    pushMutationLog({
      action: "backfill-gcal-attribution",
      data: {
        linked,
        alreadyLinked,
        attrUpdated,
        attributedByOrganizer,
        attributedByFirstWins,
        notFoundInGoogle,
        conflicted,
        dryRun
      }
    });
    return {
      ok: true,
      dryRun,
      timeWindow: { timeMin, timeMax },
      connections: gcalConns.map((c) => ({ entityId: c.entityId, email: c.email })),
      perConnection,
      totals: {
        linked,
        alreadyLinked,
        attrUpdated,
        attributedByOrganizer,
        attributedByFirstWins,
        notFoundInGoogle,
        conflicted
      },
      hint: notFoundInGoogle > 0 ? `${notFoundInGoogle} events in TQL were not found in any connected Google calendar within the time window. They may have been deleted on Google's side, or be outside the window. Widen with timeMin/timeMax to capture older events.` : void 0,
      sampleNotFound: sampleNotFound.length > 0 ? sampleNotFound : void 0
    };
  }
  if (method === "POST" && route === "backfill-gcal-participants") {
    const body = await readBody(event).catch(() => ({}));
    const agent = (body == null ? void 0 : body.agentId) || "backfill-gcal-participants";
    const dryRun = !!(body == null ? void 0 : body.dryRun);
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1e3;
    const timeMin = (body == null ? void 0 : body.timeMin) || new Date(Date.now() - twoYearsMs).toISOString();
    const timeMax = (body == null ? void 0 : body.timeMax) || new Date(Date.now() + twoYearsMs).toISOString();
    const store = kernel.getStore();
    const formatParticipant = (p) => {
      if (!(p == null ? void 0 : p.email)) return void 0;
      const name = (p.displayName || "").trim();
      return name ? `${name} <${p.email}>` : p.email;
    };
    const gcalConns = [];
    const factsByEntity = /* @__PURE__ */ new Map();
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, []);
      factsByEntity.get(fact.e).push({ a: fact.a, v: fact.v });
    }
    for (const [entityId, facts] of factsByEntity) {
      if (!facts.some((f) => f.a === "type" && f.v === "integration_connection")) continue;
      if (((_p = facts.find((f) => f.a === "integrationId")) == null ? void 0 : _p.v) !== "google-calendar") continue;
      if (((_q = facts.find((f) => f.a === "connectionStatus")) == null ? void 0 : _q.v) !== "connected") continue;
      const email = String(((_r = facts.find((f) => f.a === "accountEmail")) == null ? void 0 : _r.v) || "");
      gcalConns.push({ entityId, email });
    }
    if (gcalConns.length === 0) {
      return { ok: true, dryRun, message: "No connected google-calendar connections found." };
    }
    const gEventIdToEntityId = /* @__PURE__ */ new Map();
    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith("entity:")) continue;
      if (((_s = facts.find((f) => f.a === "source")) == null ? void 0 : _s.v) !== "google-calendar") continue;
      const gid = (_t = facts.find((f) => f.a === "googleEventId")) == null ? void 0 : _t.v;
      if (typeof gid === "string" && gid) gEventIdToEntityId.set(gid, entityId);
    }
    const perConnection = {};
    for (const conn of gcalConns) {
      const report = perConnection[conn.entityId] = {
        calendarsScanned: 0,
        eventsFetched: 0,
        organizerWritten: 0,
        attendeesWritten: 0,
        organizerSkipped: 0,
        attendeesSkipped: 0,
        unmatched: 0
      };
      try {
        const calList = await $fetch(
          `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&listCalendars=true`
        );
        const calendars = calList.items || [];
        report.calendarsScanned = calendars.length;
        for (const cal of calendars) {
          if (!cal.id) continue;
          try {
            const eventsResp = await $fetch(
              `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
            );
            const items = eventsResp.items || [];
            report.eventsFetched += items.length;
            for (const evt of items) {
              if (!evt.id) continue;
              const entityId = gEventIdToEntityId.get(evt.id);
              if (!entityId) {
                report.unmatched++;
                continue;
              }
              const organizerStr = formatParticipant(evt.organizer);
              const attendeesArr = (evt.attendees || []).map((a) => formatParticipant(a)).filter((s) => !!s);
              const facts = factsByEntity.get(entityId) || [];
              const currentOrganizer = (_u = facts.find((f) => f.a === "organizer")) == null ? void 0 : _u.v;
              const currentAttendees = facts.filter((f) => f.a === "attendees").map((f) => f.v);
              const patch = {};
              if (organizerStr && organizerStr !== currentOrganizer) {
                patch.organizer = organizerStr;
              }
              const nextSorted = [...attendeesArr].sort();
              const currSorted = currentAttendees.slice().sort();
              const attendeesChanged = nextSorted.length !== currSorted.length || nextSorted.some((v, i) => v !== currSorted[i]);
              if (attendeesArr.length > 0 && attendeesChanged) {
                patch.attendees = attendeesArr;
              }
              if (Object.keys(patch).length === 0) {
                if (organizerStr) report.organizerSkipped++;
                if (attendeesArr.length > 0) report.attendeesSkipped++;
                continue;
              }
              if (!dryRun) {
                try {
                  await kernel.updateNode(entityId, patch, "entity", { agentId: agent });
                } catch (err) {
                  console.warn(`[backfill-gcal-participants] updateNode failed for ${entityId}:`, err == null ? void 0 : err.message);
                  continue;
                }
              }
              if (patch.organizer) report.organizerWritten++;
              if (patch.attendees) report.attendeesWritten++;
            }
          } catch (err) {
            console.warn(
              `[backfill-gcal-participants] Failed calendar ${cal.id} on ${conn.entityId}:`,
              (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message)
            );
          }
        }
      } catch (err) {
        report.error = (err == null ? void 0 : err.statusMessage) || (err == null ? void 0 : err.message) || "Unknown error";
        console.error(`[backfill-gcal-participants] Connection ${conn.entityId} failed:`, report.error);
      }
    }
    const totals = Object.values(perConnection).reduce(
      (acc, r) => ({
        calendarsScanned: acc.calendarsScanned + r.calendarsScanned,
        eventsFetched: acc.eventsFetched + r.eventsFetched,
        organizerWritten: acc.organizerWritten + r.organizerWritten,
        attendeesWritten: acc.attendeesWritten + r.attendeesWritten,
        organizerSkipped: acc.organizerSkipped + r.organizerSkipped,
        attendeesSkipped: acc.attendeesSkipped + r.attendeesSkipped,
        unmatched: acc.unmatched + r.unmatched
      }),
      {
        calendarsScanned: 0,
        eventsFetched: 0,
        organizerWritten: 0,
        attendeesWritten: 0,
        organizerSkipped: 0,
        attendeesSkipped: 0,
        unmatched: 0
      }
    );
    pushMutationLog({ action: "backfill-gcal-participants", data: { totals, dryRun } });
    return {
      ok: true,
      dryRun,
      timeWindow: { timeMin, timeMax },
      connections: gcalConns.map((c) => ({ entityId: c.entityId, email: c.email })),
      perConnection,
      totals
    };
  }
  if (method === "POST" && route === "backfill-links") {
    const body = await readBody(event).catch(() => ({}));
    const dryRun = !!(body == null ? void 0 : body.dryRun);
    const steps = Array.isArray(body == null ? void 0 : body.steps) && body.steps.length > 0 ? body.steps : null;
    const agent = (body == null ? void 0 : body.agentId) || "backfill-links";
    const shouldRun = (name) => !steps || steps.includes(name);
    const store = kernel.getStore();
    const entityAttrs = /* @__PURE__ */ new Map();
    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith("entity:")) continue;
      if (!entityAttrs.has(fact.e)) entityAttrs.set(fact.e, {});
      const rec = entityAttrs.get(fact.e);
      if (rec[fact.a] === void 0) {
        rec[fact.a] = fact.v;
      } else if (Array.isArray(rec[fact.a])) {
        rec[fact.a].push(fact.v);
      } else {
        rec[fact.a] = [rec[fact.a], fact.v];
      }
    }
    const existingLinks = /* @__PURE__ */ new Set();
    for (const l of store.getAllLinks()) {
      existingLinks.add(`${l.e1}|${l.a}|${l.e2}`);
    }
    const exists = (eid) => entityAttrs.has(eid);
    const hasType = (eid, t) => {
      const attrs = entityAttrs.get(eid);
      if (!attrs) return false;
      const types = Array.isArray(attrs.type) ? attrs.type : attrs.type ? [attrs.type] : [];
      return types.includes(t);
    };
    const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    async function doLink(e1, relation, e2) {
      if (!exists(e1) || !exists(e2)) return "missing";
      const key = `${e1}|${relation}|${e2}`;
      if (existingLinks.has(key)) return "skipped";
      if (!dryRun) {
        try {
          await kernel.link(e1, relation, e2, { agentId: agent });
        } catch {
          return "missing";
        }
      }
      existingLinks.add(key);
      return "linked";
    }
    async function doCreate(id, type, data) {
      if (exists(id)) return "skipped";
      const nodeData = { ...data, type };
      if (!dryRun) {
        try {
          await kernel.createNode(id, nodeData, "entity", { agentId: agent });
        } catch {
          return "failed";
        }
      }
      entityAttrs.set(id, { ...nodeData });
      return "created";
    }
    async function ensureOntology(schema) {
      if (kernel.getOntology(schema["@id"])) return;
      if (dryRun) return;
      try {
        await kernel.createOntology(schema, { agentId: agent });
      } catch {
      }
    }
    const EMAIL_THREAD_SCHEMA = {
      "@id": "trellis:schema/email_thread",
      "@type": "trellis:Schema",
      version: "1.0.0",
      fields: [
        { name: "title", valueType: "title", required: true },
        { name: "description", valueType: "rich_text" },
        { name: "threadId", valueType: "rich_text" },
        { name: "createdAt", valueType: "date" },
        { name: "updatedAt", valueType: "date" }
      ]
    };
    const RECURRING_SERIES_SCHEMA = {
      "@id": "trellis:schema/recurring_event_series",
      "@type": "trellis:Schema",
      version: "1.0.0",
      fields: [
        { name: "title", valueType: "title", required: true },
        { name: "description", valueType: "rich_text" },
        { name: "recurringEventId", valueType: "rich_text" },
        { name: "createdAt", valueType: "date" },
        { name: "updatedAt", valueType: "date" }
      ]
    };
    const CALENDAR_SCHEMA = {
      "@id": "trellis:schema/calendar",
      "@type": "trellis:Schema",
      version: "1.0.0",
      fields: [
        { name: "title", valueType: "title", required: true },
        { name: "description", valueType: "rich_text" },
        { name: "googleCalendarId", valueType: "rich_text" },
        { name: "connectionId", valueType: "rich_text" },
        { name: "createdAt", valueType: "date" },
        { name: "updatedAt", valueType: "date" }
      ]
    };
    const results = {};
    async function runStep(name, fn) {
      if (!shouldRun(name)) return;
      try {
        results[name] = await fn();
      } catch (err) {
        results[name] = { failed: 1 };
        results[name].error = (err == null ? void 0 : err.message) || String(err);
      }
    }
    const tally = () => ({ linked: 0, skipped: 0, missing: 0, created: 0, failed: 0 });
    const bump = (t, r) => {
      t[r]++;
    };
    await runStep("connection", async () => {
      const t = tally();
      for (const [eid, attrs] of entityAttrs) {
        const conn = attrs.connectionId;
        if (typeof conn !== "string") continue;
        bump(t, await doLink(eid, "belongsTo", conn));
      }
      return t;
    });
    await runStep("integration", async () => {
      const t = tally();
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "integration_connection")) continue;
        const integrationId = attrs.integrationId;
        if (typeof integrationId !== "string") continue;
        const defId = `entity:integration-def-${integrationId}`;
        bump(t, await doLink(eid, "instanceOf", defId));
      }
      return t;
    });
    await runStep("workflow", async () => {
      const t = tally();
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "workflow-run")) continue;
        const wfId = attrs.workflowId;
        if (typeof wfId !== "string") continue;
        const targetId = wfId.startsWith("entity:") ? wfId : `entity:${wfId}`;
        bump(t, await doLink(eid, "instanceOf", targetId));
      }
      return t;
    });
    await runStep("channel", async () => {
      const t = tally();
      for (const [eid, attrs] of entityAttrs) {
        const chId = attrs.channelId;
        if (typeof chId !== "string") continue;
        const targetId = chId.startsWith("entity:") ? chId : `entity:${chId}`;
        bump(t, await doLink(eid, "postedIn", targetId));
      }
      return t;
    });
    await runStep("author", async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 };
      for (const [eid, attrs] of entityAttrs) {
        const auth = attrs.authorId || attrs.userId || attrs.createdBy;
        if (typeof auth !== "string" || !auth) continue;
        const candidates = [
          auth.startsWith("entity:") ? auth : null,
          `entity:${auth}`,
          `entity:person-${auth}`,
          `entity:user-${auth}`
        ].filter(Boolean);
        let target = candidates.find((c) => exists(c));
        if (!target) {
          const synthId = `entity:person-user-${slugify(auth)}`;
          if (!exists(synthId)) {
            const displayName = typeof attrs.authorName === "string" && attrs.authorName || typeof attrs.userName === "string" && attrs.userName || auth;
            const cr = await doCreate(synthId, "person", {
              title: displayName,
              userId: auth,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            if (cr === "created") t.created++;
            else if (cr === "failed") t.failed++;
          }
          target = synthId;
        }
        if (!exists(target)) {
          t.missing++;
          continue;
        }
        bump(t, await doLink(eid, "createdBy", target));
      }
      return t;
    });
    await runStep("email-threads", async () => {
      await ensureOntology(EMAIL_THREAD_SCHEMA);
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 };
      const threadIdToEntityId = /* @__PURE__ */ new Map();
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "email")) continue;
        const threadId = attrs.threadId || attrs.gmailThreadId;
        if (typeof threadId !== "string" || !threadId) continue;
        let threadEid = threadIdToEntityId.get(threadId);
        if (!threadEid) {
          threadEid = `entity:email-thread-${slugify(threadId)}`;
          threadIdToEntityId.set(threadId, threadEid);
          if (!exists(threadEid)) {
            const cr = await doCreate(threadEid, "email_thread", {
              title: attrs.subject || `Thread ${threadId}`,
              threadId,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            if (cr === "created") t.created++;
            else if (cr === "failed") t.failed++;
          }
        }
        bump(t, await doLink(eid, "belongsTo", threadEid));
      }
      return t;
    });
    await runStep("recurring-series", async () => {
      await ensureOntology(RECURRING_SERIES_SCHEMA);
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 };
      const seriesIdToEntityId = /* @__PURE__ */ new Map();
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "event")) continue;
        const recId = attrs.recurringEventId;
        if (typeof recId !== "string" || !recId) continue;
        let seriesEid = seriesIdToEntityId.get(recId);
        if (!seriesEid) {
          seriesEid = `entity:recurring-series-${slugify(recId)}`;
          seriesIdToEntityId.set(recId, seriesEid);
          if (!exists(seriesEid)) {
            const cr = await doCreate(seriesEid, "recurring_event_series", {
              title: attrs.title || `Recurring Series`,
              recurringEventId: recId,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            if (cr === "created") t.created++;
            else if (cr === "failed") t.failed++;
          }
        }
        bump(t, await doLink(eid, "instanceOf", seriesEid));
      }
      return t;
    });
    await runStep("calendars", async () => {
      await ensureOntology(CALENDAR_SCHEMA);
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 };
      const calKeyToEntityId = /* @__PURE__ */ new Map();
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "event")) continue;
        const calId = attrs.googleCalendarId;
        const connId = attrs.connectionId;
        if (typeof calId !== "string" || typeof connId !== "string") continue;
        const connSlug = connId.replace(/^entity:integration-conn-/, "");
        const key = `${connSlug}|${calId}`;
        let calEid = calKeyToEntityId.get(key);
        if (!calEid) {
          calEid = `entity:calendar-${slugify(connSlug)}-${slugify(calId)}`;
          calKeyToEntityId.set(key, calEid);
          if (!exists(calEid)) {
            const cr = await doCreate(calEid, "calendar", {
              title: `${calId} \u2014 ${connSlug}`,
              googleCalendarId: calId,
              connectionId: connId,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            if (cr === "created") t.created++;
            else if (cr === "failed") t.failed++;
          }
          const connLink = await doLink(calEid, "belongsTo", connId);
          if (connLink === "linked") t.linked++;
          else if (connLink === "skipped") t.skipped++;
        }
        bump(t, await doLink(eid, "belongsTo", calEid));
      }
      return t;
    });
    const personByEmail = /* @__PURE__ */ new Map();
    for (const [eid, attrs] of entityAttrs) {
      if (!hasType(eid, "person")) continue;
      const emails = [];
      for (const key of ["email", "accountEmail"]) {
        const v = attrs[key];
        if (typeof v === "string") emails.push(v);
        else if (Array.isArray(v)) emails.push(...v.filter((x) => typeof x === "string"));
      }
      for (const e of emails) personByEmail.set(e.toLowerCase(), eid);
    }
    const parseEmailAddr = (raw) => {
      if (!raw) return null;
      const angle = raw.match(/"?([^"<]*)"?\s*<([^>]+)>/);
      if (angle) {
        const name = (angle[1] || "").trim().replace(/^"|"$/g, "");
        return { name: name || void 0, email: angle[2].trim().toLowerCase() };
      }
      const bare = raw.match(/([^\s<>@]+@[^\s<>]+)/);
      if (bare) return { email: bare[1].toLowerCase() };
      return null;
    };
    const splitAddresses = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.filter((x) => typeof x === "string").flatMap((s) => s.split(/,(?![^<]*>)/)).map((s) => s.trim()).filter(Boolean);
      }
      const raw = typeof val === "string" ? val : "";
      return raw.split(/,(?![^<]*>)/).map((s) => s.trim()).filter(Boolean);
    };
    async function upsertPerson(email, name, stepCounter) {
      const key = email.toLowerCase();
      const existing = personByEmail.get(key);
      if (existing) return existing;
      const slug = slugify(email);
      if (!slug) return null;
      const personEid = `entity:person-email-${slug}`;
      if (exists(personEid)) {
        personByEmail.set(key, personEid);
        return personEid;
      }
      const cr = await doCreate(personEid, "person", {
        title: name || email,
        accountEmail: email,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (cr === "created") {
        stepCounter.created++;
        personByEmail.set(key, personEid);
        return personEid;
      }
      if (cr === "failed") {
        stepCounter.failed++;
        return null;
      }
      return personEid;
    }
    await runStep("people-from-emails", async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0, noMatch: 0 };
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "email")) continue;
        const fromRaw = typeof attrs.from === "string" ? attrs.from : "";
        const fromParsed = parseEmailAddr(fromRaw);
        if (fromParsed) {
          const pid = await upsertPerson(fromParsed.email, fromParsed.name, t);
          if (pid) bump(t, await doLink(eid, "sentBy", pid));
        } else if (fromRaw) {
          t.noMatch++;
        }
        for (const field of ["to", "cc"]) {
          for (const addr of splitAddresses(attrs[field])) {
            const parsed = parseEmailAddr(addr);
            if (!parsed) {
              t.noMatch++;
              continue;
            }
            const pid = await upsertPerson(parsed.email, parsed.name, t);
            if (pid) bump(t, await doLink(eid, "receivedBy", pid));
          }
        }
      }
      return t;
    });
    await runStep("event-attendees", async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0, noMatch: 0 };
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, "event")) continue;
        const organizerRaw = typeof attrs.organizer === "string" ? attrs.organizer : "";
        const organizerParsed = parseEmailAddr(organizerRaw);
        if (organizerParsed) {
          const pid = await upsertPerson(organizerParsed.email, organizerParsed.name, t);
          if (pid) bump(t, await doLink(eid, "organizedBy", pid));
        } else if (organizerRaw) {
          t.noMatch++;
        }
        for (const addr of splitAddresses(attrs.attendees)) {
          const parsed = parseEmailAddr(addr);
          if (!parsed) {
            t.noMatch++;
            continue;
          }
          const pid = await upsertPerson(parsed.email, parsed.name, t);
          if (pid) bump(t, await doLink(eid, "attendedBy", pid));
        }
      }
      return t;
    });
    const grandTotalLinked = Object.values(results).reduce((sum, r) => sum + (r.linked || 0), 0);
    const grandTotalCreated = Object.values(results).reduce((sum, r) => sum + (r.created || 0), 0);
    pushMutationLog({
      action: "backfill-links",
      data: { dryRun, linked: grandTotalLinked, created: grandTotalCreated, steps: results }
    });
    return {
      ok: true,
      dryRun,
      totals: { linked: grandTotalLinked, created: grandTotalCreated },
      steps: results
    };
  }
  if (method === "GET" && route === "embeddings") {
    const url = getRequestURL(event);
    const idsParam = url.searchParams.get("ids") || "";
    const idFilter = idsParam ? new Set(
      idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    ) : null;
    const store = kernel.getStore();
    const vectorsByEntity = /* @__PURE__ */ new Map();
    let model = null;
    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith("entity:")) continue;
      if (idFilter && !idFilter.has(fact.e)) continue;
      if (fact.a === "embedding" && typeof fact.v === "number") {
        if (!vectorsByEntity.has(fact.e)) vectorsByEntity.set(fact.e, []);
        vectorsByEntity.get(fact.e).push(fact.v);
      } else if (fact.a === "embeddingModel" && !model && typeof fact.v === "string") {
        model = fact.v;
      }
    }
    const vectors = {};
    let dimensions = 0;
    for (const [id, vec] of vectorsByEntity) {
      vectors[id] = vec;
      if (vec.length > dimensions) dimensions = vec.length;
    }
    return {
      ok: true,
      model: model || "unknown",
      dimensions,
      count: vectorsByEntity.size,
      vectors
    };
  }
  if (method === "POST" && route === "backfill-embeddings") {
    const body = await readBody(event).catch(() => ({}));
    const agent = (body == null ? void 0 : body.agentId) || "backfill-embeddings";
    const dryRun = !!(body == null ? void 0 : body.dryRun);
    const force = !!(body == null ? void 0 : body.force);
    const model = (body == null ? void 0 : body.model) || process.env.TRELLIS_EMBED_MODEL || "nomic-embed-text";
    const batchSize = Math.max(1, Math.min(64, Number(body == null ? void 0 : body.batchSize) || 16));
    const limit = Math.max(0, Number(body == null ? void 0 : body.limit) || 0);
    const store = kernel.getStore();
    const factsByEntity = /* @__PURE__ */ new Map();
    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith("entity:")) continue;
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, []);
      factsByEntity.get(fact.e).push({ a: fact.a, v: fact.v });
    }
    const SOURCE_FIELDS = ["title", "type", "description", "notes", "location", "summary", "category"];
    const buildSourceText = (facts) => {
      const parts = [];
      for (const field of SOURCE_FIELDS) {
        const vals = facts.filter((f) => f.a === field).map((f) => f.v);
        for (const v of vals) {
          if (typeof v === "string" && v.trim()) parts.push(v.trim());
        }
      }
      const tags = facts.filter((f) => f.a === "tags").map((f) => f.v);
      for (const t of tags) {
        if (typeof t === "string") parts.push(`#${t}`);
      }
      return parts.join(" \u2014 ");
    };
    const hashString = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
      }
      return h.toString(16).padStart(8, "0");
    };
    const pending = [];
    let skipped = 0;
    let noContent = 0;
    for (const [entityId, facts] of factsByEntity) {
      const text = buildSourceText(facts);
      if (!text) {
        noContent++;
        continue;
      }
      const hash = hashString(`${model}:${text}`);
      if (!force) {
        const existingHash = (_v = facts.find((f) => f.a === "embeddingHash")) == null ? void 0 : _v.v;
        const hasVector = facts.some((f) => f.a === "embedding");
        if (existingHash === hash && hasVector) {
          skipped++;
          continue;
        }
      }
      pending.push({ entityId, text, hash });
      if (limit > 0 && pending.length >= limit) break;
    }
    if (dryRun || pending.length === 0) {
      return {
        ok: true,
        dryRun,
        model,
        totals: {
          embedded: 0,
          skipped,
          noContent,
          pending: pending.length,
          total: factsByEntity.size
        }
      };
    }
    let embedded = 0;
    let failed = 0;
    const errors = [];
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      let vectors;
      try {
        const res = await $fetch("/api/llm/embed", {
          method: "POST",
          body: { model, input: batch.map((b) => b.text) }
        });
        vectors = res.embeddings;
      } catch (err) {
        failed += batch.length;
        errors.push(`batch ${i}-${i + batch.length}: ${(err == null ? void 0 : err.message) || String(err)}`);
        continue;
      }
      for (let j = 0; j < batch.length; j++) {
        const pendingItem = batch[j];
        const vec = vectors[j];
        if (!Array.isArray(vec) || vec.length === 0) {
          failed++;
          continue;
        }
        try {
          await kernel.updateNode(
            pendingItem.entityId,
            {
              embedding: vec,
              embeddingModel: model,
              embeddingHash: pendingItem.hash
            },
            "entity",
            { agentId: agent }
          );
          embedded++;
        } catch (err) {
          failed++;
          errors.push(`${pendingItem.entityId}: ${(err == null ? void 0 : err.message) || String(err)}`);
        }
      }
    }
    pushMutationLog({
      action: "backfill-embeddings",
      data: { model, embedded, skipped, failed, noContent, total: factsByEntity.size }
    });
    return {
      ok: true,
      model,
      totals: {
        embedded,
        skipped,
        failed,
        noContent,
        pending: pending.length,
        total: factsByEntity.size
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : void 0
    };
  }
  if (method === "DELETE" && route === "purge") {
    const body = await readBody(event).catch(() => ({}));
    const agent = (body == null ? void 0 : body.agentId) || "browser";
    const store = kernel.getStore();
    const entityIds = /* @__PURE__ */ new Set();
    for (const fact of store.getAllFacts()) {
      if (fact.e.startsWith("entity:")) {
        entityIds.add(fact.e);
      }
    }
    let deleted = 0;
    for (const entityId of entityIds) {
      try {
        await kernel.deleteNode(entityId, { agentId: agent });
        deleted++;
      } catch {
      }
    }
    pushMutationLog({ action: "purge", data: { deleted } });
    emitMutation({ action: "purge", entityId: "*", agentId: agent, data: { deleted } });
    return { ok: true, deleted };
  }
  throw createError({ statusCode: 404, message: `Unknown graph API route: ${method} /api/graph/${path}` });
});

export { ____path_ as default };
//# sourceMappingURL=_...path_.mjs.map

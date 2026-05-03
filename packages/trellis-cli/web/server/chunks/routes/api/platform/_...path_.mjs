import { d as defineEventHandler, e as useTqlKernel, c as createError, n as parseApiBody, p as pushMutationLog, f as emitMutation, k as parseApiQuery, X as PlatformOrgCreateBodySchema, Y as PlatformAppListQuerySchema, Z as PlatformAppCreateBodySchema, _ as PlatformUpdateBodySchema, $ as PlatformDeleteBodySchema, a0 as PlatformContextQuerySchema, a1 as PlatformOptionalAppQuerySchema, a2 as PlatformCollectionCreateBodySchema, a3 as PlatformPageCreateBodySchema, a4 as PlatformCommentAddBodySchema, a5 as PlatformTagCreateBodySchema, a6 as PlatformTagAssignBodySchema, a7 as PlatformBulkUpdateBodySchema, a8 as PlatformBulkDeleteBodySchema, a9 as PlatformWorkflowCreateBodySchema, aa as PlatformSettingGetQuerySchema, ab as PlatformSettingSetBodySchema, ac as PlatformSettingListQuerySchema, ad as PlatformFileUploadBodySchema, ae as PlatformInviteSendBodySchema } from '../../../nitro/nitro.mjs';
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
function queryPlatformNodes(kernel, prefix, filterFn) {
  const store = kernel.getStore();
  const entityIds = /* @__PURE__ */ new Set();
  for (const fact of store.getAllFacts()) {
    if (fact.e.startsWith(prefix)) {
      entityIds.add(fact.e);
    }
  }
  const results = [];
  for (const eid of entityIds) {
    const facts = store.getFactsByEntity(eid);
    if (facts.length > 0) {
      const n = factsToNode(eid, facts);
      if (!filterFn || filterFn(n)) {
        results.push(n);
      }
    }
  }
  return results;
}
function getNode(kernel, entityId) {
  const store = kernel.getStore();
  const facts = store.getFactsByEntity(entityId);
  if (facts.length === 0) return null;
  return factsToNode(entityId, facts);
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ____path_ = defineEventHandler(async (event) => {
  var _a;
  let kernel;
  try {
    kernel = useTqlKernel();
  } catch {
    throw createError({ statusCode: 503, message: "TQL kernel not initialized" });
  }
  const method = event.method;
  const path = ((_a = event.context.params) == null ? void 0 : _a.path) || "";
  const segments = path.split("/").filter(Boolean);
  const domain = segments[0] || "";
  const action = segments[1] || "";
  const restId = segments.slice(2).join("/");
  if (method === "GET" && domain === "org" && action === "list") {
    const nodes = queryPlatformNodes(kernel, "platform:org/");
    return { ok: true, orgs: nodes };
  }
  if (method === "POST" && domain === "org" && action === "create") {
    const { name, slug, description, agentId } = await parseApiBody(event, PlatformOrgCreateBodySchema);
    const agent = agentId || "cli";
    const orgSlug = slug || slugify(name);
    const entityId = `platform:org/${orgSlug}`;
    const existing = getNode(kernel, entityId);
    if (existing) {
      return { ok: true, id: entityId, org: existing, created: false };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "org",
      title: name,
      slug: orgSlug,
      description: description || "",
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    await kernel.createNode(entityId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createOrg", entityId, data });
    emitMutation({ action: "createOrg", entityId, type: "platform", agentId: agent, data });
    return { ok: true, id: entityId, org: { "@id": entityId, ...data }, created: true };
  }
  if (method === "GET" && domain === "org" && action && action !== "list") {
    const entityId = `platform:org/${action}${restId ? "/" + restId : ""}`;
    const node = getNode(kernel, entityId);
    if (!node) {
      throw createError({ statusCode: 404, message: `Org not found: ${entityId}` });
    }
    return { ok: true, org: node };
  }
  if (method === "GET" && domain === "app" && action === "list") {
    const { orgId } = parseApiQuery(event, PlatformAppListQuerySchema);
    const nodes = queryPlatformNodes(kernel, "platform:app/", (node) => {
      if (orgId && node.orgId !== orgId) return false;
      return true;
    });
    return { ok: true, apps: nodes };
  }
  if (method === "POST" && domain === "app" && action === "create") {
    const { name, slug, orgId, icon, color, description, ontologies, agentId } = await parseApiBody(
      event,
      PlatformAppCreateBodySchema
    );
    const agent = agentId || "cli";
    const appSlug = slug || slugify(name);
    const entityId = `platform:app/${appSlug}`;
    const existing = getNode(kernel, entityId);
    if (existing) {
      return { ok: true, id: entityId, app: existing, created: false };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "app",
      title: name,
      slug: appSlug,
      orgId: orgId || "",
      icon: icon || "lucide:layout-grid",
      color: color || "#6366f1",
      description: description || "",
      ontologies: ontologies || [],
      createdAt: now,
      updatedAt: now
    };
    await kernel.createNode(entityId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createApp", entityId, data });
    emitMutation({ action: "createApp", entityId, type: "platform", agentId: agent, data });
    if (orgId) {
      try {
        await kernel.link(orgId, "hasApp", entityId, { agentId: agent });
      } catch {
      }
    }
    return { ok: true, id: entityId, app: { "@id": entityId, ...data }, created: true };
  }
  if (method === "GET" && domain === "app" && action && action !== "list") {
    const entityId = `platform:app/${action}${restId ? "/" + restId : ""}`;
    const node = getNode(kernel, entityId);
    if (!node) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` });
    }
    return { ok: true, app: node };
  }
  if (method === "PUT" && domain === "app" && action) {
    const entityId = `platform:app/${action}${restId ? "/" + restId : ""}`;
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` });
    }
    const updateData = { ...data || {}, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await kernel.updateNode(entityId, updateData, "platform", { agentId: agent });
    pushMutationLog({ action: "updateApp", entityId, data: updateData });
    emitMutation({ action: "updateApp", entityId, type: "platform", agentId: agent, data: updateData });
    return { ok: true, id: entityId };
  }
  if (method === "DELETE" && domain === "app" && action) {
    const entityId = `platform:app/${action}${restId ? "/" + restId : ""}`;
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` });
    }
    await kernel.deleteNode(entityId, { agentId: agent });
    pushMutationLog({ action: "deleteApp", entityId });
    emitMutation({ action: "deleteApp", entityId, agentId: agent });
    return { ok: true, id: entityId };
  }
  if (method === "GET" && domain === "context") {
    const { orgId, appId } = parseApiQuery(event, PlatformContextQuerySchema);
    let org = null;
    let app = null;
    if (orgId) {
      org = getNode(kernel, orgId.startsWith("platform:org/") ? orgId : `platform:org/${orgId}`);
    }
    if (appId) {
      app = getNode(kernel, appId.startsWith("platform:app/") ? appId : `platform:app/${appId}`);
    }
    if (!org) {
      const orgs = queryPlatformNodes(kernel, "platform:org/");
      org = orgs[0] || null;
    }
    if (!app && org) {
      const orgEntityId = org["@id"];
      const apps = queryPlatformNodes(kernel, "platform:app/", (n) => n.orgId === orgEntityId);
      app = apps[0] || null;
    }
    return { ok: true, org, app };
  }
  if (method === "GET" && domain === "collection" && action === "list") {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema);
    const nodes = queryPlatformNodes(kernel, "platform:collection/", (node) => {
      if (appId && node.appId !== appId) return false;
      return true;
    });
    return { ok: true, collections: nodes };
  }
  if (method === "POST" && domain === "collection" && action === "create") {
    const {
      name,
      slug,
      appId,
      type: collType,
      description,
      schema,
      agentId
    } = await parseApiBody(event, PlatformCollectionCreateBodySchema);
    const agent = agentId || "cli";
    const collSlug = slug || slugify(name);
    const entityId = `platform:collection/${collSlug}`;
    const existing = getNode(kernel, entityId);
    if (existing) {
      return { ok: true, id: entityId, collection: existing, created: false };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "collection",
      title: name,
      slug: collSlug,
      appId: appId || "",
      collectionType: collType || "database",
      description: description || "",
      schema: schema || null,
      createdAt: now,
      updatedAt: now
    };
    await kernel.createNode(entityId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createCollection", entityId, data });
    emitMutation({ action: "createCollection", entityId, type: "platform", agentId: agent, data });
    return { ok: true, id: entityId, collection: { "@id": entityId, ...data }, created: true };
  }
  if (method === "PUT" && domain === "collection" && action) {
    const entityId = `platform:collection/${action}${restId ? "/" + restId : ""}`;
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Collection not found: ${entityId}` });
    }
    const updateData = { ...data || {}, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await kernel.updateNode(entityId, updateData, "platform", { agentId: agent });
    pushMutationLog({ action: "updateCollection", entityId, data: updateData });
    emitMutation({ action: "updateCollection", entityId, type: "platform", agentId: agent, data: updateData });
    return { ok: true, id: entityId };
  }
  if (method === "DELETE" && domain === "collection" && action) {
    const entityId = `platform:collection/${action}${restId ? "/" + restId : ""}`;
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Collection not found: ${entityId}` });
    }
    await kernel.deleteNode(entityId, { agentId: agent });
    pushMutationLog({ action: "deleteCollection", entityId });
    emitMutation({ action: "deleteCollection", entityId, agentId: agent });
    return { ok: true, id: entityId };
  }
  if (method === "GET" && domain === "page" && action === "list") {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema);
    const nodes = queryPlatformNodes(kernel, "platform:page/", (node) => {
      if (appId && node.appId !== appId) return false;
      return true;
    });
    return { ok: true, pages: nodes };
  }
  if (method === "POST" && domain === "page" && action === "create") {
    const { title, appId, dataSource, layout, defaultProjection, description, icon, agentId } = await parseApiBody(
      event,
      PlatformPageCreateBodySchema
    );
    const agent = agentId || "cli";
    const pageId = `platform:page/${slugify(title)}-${Date.now().toString(36)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "page",
      title,
      appId: appId || "",
      dataSource: dataSource || "all",
      layout: layout || "grid",
      defaultProjection: defaultProjection || "table",
      description: description || "",
      icon: icon || "lucide:file",
      createdAt: now,
      updatedAt: now
    };
    await kernel.createNode(pageId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createPage", entityId: pageId, data });
    emitMutation({ action: "createPage", entityId: pageId, type: "platform", agentId: agent, data });
    return { ok: true, id: pageId, page: { "@id": pageId, ...data }, created: true };
  }
  if (method === "PUT" && domain === "page" && action) {
    const entityId = `platform:page/${action}${restId ? "/" + restId : ""}`;
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Page not found: ${entityId}` });
    }
    const updateData = { ...data || {}, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await kernel.updateNode(entityId, updateData, "platform", { agentId: agent });
    pushMutationLog({ action: "updatePage", entityId, data: updateData });
    emitMutation({ action: "updatePage", entityId, type: "platform", agentId: agent, data: updateData });
    return { ok: true, id: entityId };
  }
  if (method === "DELETE" && domain === "page" && action) {
    const entityId = `platform:page/${action}${restId ? "/" + restId : ""}`;
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Page not found: ${entityId}` });
    }
    await kernel.deleteNode(entityId, { agentId: agent });
    pushMutationLog({ action: "deletePage", entityId });
    emitMutation({ action: "deletePage", entityId, agentId: agent });
    return { ok: true, id: entityId };
  }
  if (method === "GET" && domain === "comment" && action === "list") {
    const targetEntityId = restId || segments[2] || "";
    if (!targetEntityId) {
      throw createError({ statusCode: 400, message: "entityId is required" });
    }
    const nodes = queryPlatformNodes(kernel, "comment:", (node) => {
      return node.entityId === targetEntityId;
    });
    nodes.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return { ok: true, comments: nodes };
  }
  if (method === "POST" && domain === "comment" && action === "add") {
    const {
      entityId: targetEntityId,
      content,
      commentType,
      authorId,
      authorName,
      metadata,
      agentId
    } = await parseApiBody(event, PlatformCommentAddBodySchema);
    const agent = agentId || "cli";
    const commentId = `comment:${crypto.randomUUID()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "comment",
      entityId: targetEntityId,
      entityType: "entity",
      content,
      commentType: commentType || "comment",
      authorId: authorId || agent,
      authorName: authorName || agent,
      metadata: metadata || null,
      createdAt: now
    };
    await kernel.createNode(commentId, data, "comment", { agentId: agent });
    try {
      const fullEntityId = targetEntityId.includes(":") ? targetEntityId : `entity:${targetEntityId}`;
      await kernel.link(fullEntityId, "hasComment", commentId, { agentId: agent });
    } catch {
    }
    pushMutationLog({ action: "addComment", entityId: commentId, data });
    emitMutation({ action: "addComment", entityId: commentId, type: "comment", agentId: agent, data });
    return { ok: true, id: commentId, comment: { "@id": commentId, ...data } };
  }
  if (method === "GET" && domain === "tag" && action === "list") {
    const nodes = queryPlatformNodes(kernel, "platform:tag/");
    return { ok: true, tags: nodes };
  }
  if (method === "POST" && domain === "tag" && action === "create") {
    const { name, color, description, agentId } = await parseApiBody(event, PlatformTagCreateBodySchema);
    const agent = agentId || "cli";
    const tagSlug = slugify(name);
    const entityId = `platform:tag/${tagSlug}`;
    const existing = getNode(kernel, entityId);
    if (existing) {
      return { ok: true, id: entityId, tag: existing, created: false };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "tag",
      title: name,
      slug: tagSlug,
      color: color || "",
      description: description || "",
      createdAt: now
    };
    await kernel.createNode(entityId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createTag", entityId, data });
    emitMutation({ action: "createTag", entityId, type: "platform", agentId: agent, data });
    return { ok: true, id: entityId, tag: { "@id": entityId, ...data }, created: true };
  }
  if (method === "POST" && domain === "tag" && action === "assign") {
    const { entityId: targetEntityId, tags, agentId } = await parseApiBody(event, PlatformTagAssignBodySchema);
    const agent = agentId || "cli";
    const linked = [];
    for (const tagName of tags) {
      const tagSlug = slugify(tagName);
      const tagEntityId = `platform:tag/${tagSlug}`;
      const existing = getNode(kernel, tagEntityId);
      if (!existing) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await kernel.createNode(
          tagEntityId,
          {
            type: "tag",
            title: tagName,
            slug: tagSlug,
            color: "",
            createdAt: now
          },
          "platform",
          { agentId: agent }
        );
      }
      const fullEntityId = targetEntityId.includes(":") ? targetEntityId : `entity:${targetEntityId}`;
      try {
        await kernel.link(fullEntityId, "taggedWith", tagEntityId, { agentId: agent });
        linked.push(tagSlug);
      } catch {
      }
    }
    return { ok: true, entityId: targetEntityId, tagsLinked: linked };
  }
  if (method === "POST" && domain === "bulk" && action === "update") {
    const { query: eqls, data, agentId } = await parseApiBody(event, PlatformBulkUpdateBodySchema);
    const agent = agentId || "cli";
    const result = await kernel.query(eqls);
    const rows = result.rows || [];
    if (rows.length === 0) {
      return { ok: true, updated: 0, ids: [] };
    }
    const ids = [];
    for (const row of rows) {
      const values = Object.values(row);
      if (values.length > 0 && typeof values[0] === "string") {
        ids.push(values[0]);
      }
    }
    let updated = 0;
    for (const entityId of ids) {
      try {
        await kernel.updateNode(entityId, data, "entity", { agentId: agent });
        updated++;
      } catch {
      }
    }
    pushMutationLog({ action: "bulkUpdate", data: { query: eqls, updated } });
    emitMutation({ action: "bulkUpdate", entityId: "*", agentId: agent, data: { query: eqls, updated } });
    return { ok: true, updated, ids };
  }
  if (method === "POST" && domain === "bulk" && action === "delete") {
    const { query: eqls, agentId } = await parseApiBody(event, PlatformBulkDeleteBodySchema);
    const agent = agentId || "cli";
    const result = await kernel.query(eqls);
    const rows = result.rows || [];
    if (rows.length === 0) {
      return { ok: true, deleted: 0, ids: [] };
    }
    const ids = [];
    for (const row of rows) {
      const values = Object.values(row);
      if (values.length > 0 && typeof values[0] === "string") {
        ids.push(values[0]);
      }
    }
    let deleted = 0;
    for (const entityId of ids) {
      try {
        await kernel.deleteNode(entityId, { agentId: agent });
        deleted++;
      } catch {
      }
    }
    pushMutationLog({ action: "bulkDelete", data: { query: eqls, deleted } });
    emitMutation({ action: "bulkDelete", entityId: "*", agentId: agent, data: { query: eqls, deleted } });
    return { ok: true, deleted, ids };
  }
  if (method === "GET" && domain === "workflow" && action === "list") {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema);
    const nodes = queryPlatformNodes(kernel, "platform:workflow/", (node) => {
      if (appId && node.appId !== appId) return false;
      return true;
    });
    return { ok: true, workflows: nodes };
  }
  if (method === "POST" && domain === "workflow" && action === "create") {
    const { name, appId, trigger, graph, description, agentId } = await parseApiBody(
      event,
      PlatformWorkflowCreateBodySchema
    );
    const agent = agentId || "cli";
    const wfId = `platform:workflow/${slugify(name)}-${Date.now().toString(36)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "workflow",
      title: name,
      appId: appId || "",
      description: description || "",
      trigger: trigger || null,
      graph: graph || null,
      status: "draft",
      createdAt: now,
      updatedAt: now
    };
    await kernel.createNode(wfId, data, "platform", { agentId: agent });
    pushMutationLog({ action: "createWorkflow", entityId: wfId, data });
    emitMutation({ action: "createWorkflow", entityId: wfId, type: "platform", agentId: agent, data });
    return { ok: true, id: wfId, workflow: { "@id": wfId, ...data }, created: true };
  }
  if (method === "PUT" && domain === "workflow" && action) {
    const entityId = `platform:workflow/${action}${restId ? "/" + restId : ""}`;
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Workflow not found: ${entityId}` });
    }
    const updateData = { ...data || {}, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await kernel.updateNode(entityId, updateData, "platform", { agentId: agent });
    pushMutationLog({ action: "updateWorkflow", entityId, data: updateData });
    emitMutation({ action: "updateWorkflow", entityId, type: "platform", agentId: agent, data: updateData });
    return { ok: true, id: entityId };
  }
  if (method === "DELETE" && domain === "workflow" && action) {
    const entityId = `platform:workflow/${action}${restId ? "/" + restId : ""}`;
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema);
    const agent = agentId || "cli";
    const existing = getNode(kernel, entityId);
    if (!existing) {
      throw createError({ statusCode: 404, message: `Workflow not found: ${entityId}` });
    }
    await kernel.deleteNode(entityId, { agentId: agent });
    pushMutationLog({ action: "deleteWorkflow", entityId });
    emitMutation({ action: "deleteWorkflow", entityId, agentId: agent });
    return { ok: true, id: entityId };
  }
  if (method === "GET" && domain === "setting" && action === "get") {
    const { key, scope } = parseApiQuery(event, PlatformSettingGetQuerySchema);
    const entityId = `platform:setting/${scope}/${key}`;
    const node = getNode(kernel, entityId);
    if (!node) {
      return { ok: true, key, value: null, found: false };
    }
    return { ok: true, key, value: node.value, scope, found: true };
  }
  if (method === "POST" && domain === "setting" && action === "set") {
    const { key, value, scope: bodyScope, agentId } = await parseApiBody(event, PlatformSettingSetBodySchema);
    const agent = agentId || "cli";
    const scope = bodyScope || "app";
    const entityId = `platform:setting/${scope}/${key}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const data = {
      type: "setting",
      key,
      value,
      scope,
      updatedAt: now
    };
    const existing = getNode(kernel, entityId);
    if (existing) {
      await kernel.updateNode(entityId, data, "platform", { agentId: agent });
    } else {
      data.createdAt = now;
      await kernel.createNode(entityId, data, "platform", { agentId: agent });
    }
    pushMutationLog({ action: "setSetting", entityId, data });
    emitMutation({ action: "setSetting", entityId, type: "platform", agentId: agent, data });
    return { ok: true, key, value, scope };
  }
  if (method === "GET" && domain === "setting" && action === "list") {
    const { scope } = parseApiQuery(event, PlatformSettingListQuerySchema);
    const prefix = `platform:setting/${scope}/`;
    const nodes = queryPlatformNodes(kernel, prefix);
    return { ok: true, settings: nodes, scope };
  }
  if (method === "POST" && domain === "file" && action === "upload") {
    const body = await parseApiBody(event, PlatformFileUploadBodySchema);
    const { entityId: targetEntityId, field, agentId } = body;
    const { filename, contentType: ct } = body;
    const agent = agentId || "cli";
    const storagePath = targetEntityId ? `entities/${targetEntityId.replace(/:/g, "/")}/${filename}` : `uploads/${Date.now()}-${filename}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const fileRef = {
      filename,
      contentType: ct || "application/octet-stream",
      storagePath,
      uploadedAt: now,
      uploadedBy: agent
    };
    if (targetEntityId && field) {
      const fullId = targetEntityId.includes(":") ? targetEntityId : `entity:${targetEntityId}`;
      try {
        await kernel.updateNode(fullId, { [field]: storagePath }, "entity", { agentId: agent });
      } catch {
      }
    }
    pushMutationLog({ action: "fileUpload", entityId: storagePath, data: fileRef });
    return { ok: true, path: storagePath, filename, ...fileRef };
  }
  if (method === "POST" && domain === "invite" && action === "send") {
    const { email, emails, role, orgId, orgName, agentId } = await parseApiBody(event, PlatformInviteSendBodySchema);
    const agent = agentId || "cli";
    const emailList = emails || (email ? [email] : []);
    try {
      const result = await $fetch("/api/invite", {
        method: "POST",
        body: {
          emails: emailList,
          orgId: orgId || "",
          orgName: orgName || "",
          appId: "",
          inviterId: agent,
          inviterName: agent,
          role: role || "member"
        }
      });
      return result;
    } catch (err) {
      throw createError({ statusCode: 500, message: (err == null ? void 0 : err.message) || "Invite failed" });
    }
  }
  throw createError({ statusCode: 404, message: `Unknown platform API route: ${method} /api/platform/${path}` });
});

export { ____path_ as default };
//# sourceMappingURL=_...path_.mjs.map

import { d as defineEventHandler, h as getQuery, u as useInstantAdmin, c as createError, M as useRuntimeConfig } from '../../nitro/nitro.mjs';
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

const workspaceContext_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = query.userId;
  const config = useRuntimeConfig();
  const dataMode = config.public.dataMode || process.env.TRELLIS_DATA_MODE || "local";
  if (dataMode === "local") {
    return { ok: true, org: null, apps: [], lastOrgId: null, lastAppId: null };
  }
  const db = useInstantAdmin();
  try {
    const settingsResp = await db.query({
      settings: {
        $: {
          where: {
            ownerId: userId
          }
        }
      }
    });
    const settings = (settingsResp == null ? void 0 : settingsResp.settings) || [];
    let lastOrgId = null;
    let lastAppId = null;
    for (const s of settings) {
      if (s.key === "lastOrgId" && typeof s.value === "string") lastOrgId = s.value;
      if (s.key === "lastAppId" && typeof s.value === "string") lastAppId = s.value;
    }
    if (!lastOrgId) {
      return { ok: true, org: null, apps: [], lastOrgId: null, lastAppId: null };
    }
    const orgResp = await db.query({
      organizations: {
        $: { where: { id: lastOrgId } }
      }
    });
    const orgs = (orgResp == null ? void 0 : orgResp.organizations) || [];
    const org = orgs[0] || null;
    if (!org) {
      return { ok: true, org: null, apps: [], lastOrgId, lastAppId };
    }
    const appsResp = await db.query({
      applications: {
        $: { where: { orgId: lastOrgId } }
      }
    });
    const apps = (appsResp == null ? void 0 : appsResp.applications) || [];
    return {
      ok: true,
      org,
      apps,
      lastOrgId,
      lastAppId
    };
  } catch (err) {
    console.error("[workspace-context] Error:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, message: "Failed to resolve workspace context" });
  }
});

export { workspaceContext_get as default };
//# sourceMappingURL=workspace-context.get.mjs.map

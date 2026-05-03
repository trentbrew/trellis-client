import { d as defineEventHandler, r as readBody, u as useInstantAdmin, c as createError } from '../../../nitro/nitro.mjs';
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

const SEED_APP_SLUGS = /* @__PURE__ */ new Set([
  "life",
  "work",
  "game-dev-project",
  "health",
  "learning",
  "connector-hub",
  "trip-planner",
  "family-finance"
]);
const SEED_ORG_IDS = /* @__PURE__ */ new Set([
  "org_turtle_labs"
]);
const SEED_APP_IDS = /* @__PURE__ */ new Set([
  "app_turtle_labs_workspace"
]);
const purgeSeedData_post = defineEventHandler(async (event) => {
  const body = await readBody(event) || {};
  const dryRun = body.dryRun === true;
  const userId = body.userId;
  const db = useInstantAdmin();
  try {
    const [orgsResp, appsResp] = await Promise.all([
      db.query({ organizations: {} }),
      db.query({ applications: {} })
    ]);
    const allOrgs = (orgsResp == null ? void 0 : orgsResp.organizations) || [];
    const allApps = (appsResp == null ? void 0 : appsResp.applications) || [];
    const orgsToDelete = allOrgs.filter((org) => {
      if (SEED_ORG_IDS.has(org.id)) return true;
      if (!org.ownerId) return true;
      if (userId && org.ownerId === userId) {
        return false;
      }
      return false;
    });
    const deletedOrgIds = new Set(orgsToDelete.map((o) => o.id));
    const appsToDelete = allApps.filter((app) => {
      if (SEED_APP_IDS.has(app.id)) return true;
      if (SEED_APP_SLUGS.has(app.slug)) return true;
      if (deletedOrgIds.has(app.orgId)) return true;
      if (app.ownerId === "user-demo-admin") return true;
      return false;
    });
    const report = {
      orgsToDelete: orgsToDelete.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
      appsToDelete: appsToDelete.map((a) => ({ id: a.id, name: a.name, slug: a.slug, orgId: a.orgId })),
      totalOrgs: orgsToDelete.length,
      totalApps: appsToDelete.length,
      dryRun
    };
    if (dryRun) {
      return { ok: true, ...report, message: "Dry run \u2014 nothing was deleted" };
    }
    const tx = db.tx;
    const deleteTxs = [];
    for (const app of appsToDelete) {
      deleteTxs.push(tx.applications[app.id].delete());
    }
    for (const org of orgsToDelete) {
      deleteTxs.push(tx.organizations[org.id].delete());
    }
    if (deleteTxs.length > 0) {
      await db.transact(deleteTxs);
    }
    return { ok: true, ...report, message: `Deleted ${orgsToDelete.length} orgs and ${appsToDelete.length} apps` };
  } catch (err) {
    console.error("[purge-seed-data] Error:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, message: "Failed to purge seed data" });
  }
});

export { purgeSeedData_post as default };
//# sourceMappingURL=purge-seed-data.post.mjs.map

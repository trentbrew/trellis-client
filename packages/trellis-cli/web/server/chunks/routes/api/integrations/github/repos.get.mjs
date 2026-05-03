import { d as defineEventHandler, h as getQuery, c as createError, P as requireConnectionOwner } from '../../../../nitro/nitro.mjs';
import { getValidAccessToken } from './_credentials.mjs';
import { normalizeRepo } from './_shared.mjs';
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

const repos_get = defineEventHandler(async (event) => {
  var _a;
  const query = getQuery(event);
  const connectionId = query.connectionId;
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId query parameter." });
  }
  await requireConnectionOwner(event, connectionId);
  const accessToken = await getValidAccessToken(connectionId);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Trellis-Client"
  };
  const params = new URLSearchParams({
    affiliation: query.affiliation || "owner,collaborator,organization_member",
    visibility: query.visibility || "all",
    sort: query.sort || "pushed",
    direction: query.direction || "desc",
    per_page: String(Math.min(Number(query.per_page) || 50, 100)),
    page: String(Number(query.page) || 1)
  });
  let raws;
  try {
    raws = await $fetch(`https://api.github.com/user/repos?${params.toString()}`, {
      headers
    });
  } catch (err) {
    console.error("[github/repos] Failed to list repos:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to list repositories from GitHub." });
  }
  let repos = (raws || []).map(normalizeRepo);
  const q = (_a = query.q) == null ? void 0 : _a.trim().toLowerCase();
  if (q) {
    repos = repos.filter(
      (r) => {
        var _a2, _b;
        return r.fullName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || ((_b = (_a2 = r.description) == null ? void 0 : _a2.toLowerCase().includes(q)) != null ? _b : false);
      }
    );
  }
  return { repos };
});

export { repos_get as default };
//# sourceMappingURL=repos.get.mjs.map

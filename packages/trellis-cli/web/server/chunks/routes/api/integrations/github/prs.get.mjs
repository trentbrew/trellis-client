import { d as defineEventHandler, h as getQuery, c as createError, P as requireConnectionOwner } from '../../../../nitro/nitro.mjs';
import { getValidAccessToken } from './_credentials.mjs';
import { normalizePr } from './_shared.mjs';
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

const prs_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const connectionId = query.connectionId;
  const repo = query.repo;
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId query parameter." });
  }
  if (!repo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing repo query parameter (expected "owner/name").'
    });
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
    state: query.state || "open",
    sort: query.sort || "updated",
    direction: query.direction || "desc",
    per_page: String(Math.min(Number(query.per_page) || 50, 100)),
    page: String(Number(query.page) || 1)
  });
  if (query.head) params.set("head", query.head);
  if (query.base) params.set("base", query.base);
  const url = `https://api.github.com/repos/${encodeURI(repo)}/pulls?${params.toString()}`;
  let raws;
  try {
    raws = await $fetch(url, { headers });
  } catch (err) {
    console.error("[github/prs] Failed to list pull requests:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to list pull requests from GitHub." });
  }
  const prs = (raws || []).map(normalizePr);
  return { pulls: prs };
});

export { prs_get as default };
//# sourceMappingURL=prs.get.mjs.map

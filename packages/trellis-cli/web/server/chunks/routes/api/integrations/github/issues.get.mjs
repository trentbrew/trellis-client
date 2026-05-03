import { d as defineEventHandler, h as getQuery, c as createError, P as requireConnectionOwner } from '../../../../nitro/nitro.mjs';
import { getValidAccessToken } from './_credentials.mjs';
import { normalizeIssue } from './_shared.mjs';
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

const issues_get = defineEventHandler(async (event) => {
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
    state: query.state || "open",
    sort: query.sort || "updated",
    direction: query.direction || "desc",
    per_page: String(Math.min(Number(query.per_page) || 50, 100)),
    page: String(Number(query.page) || 1)
  });
  if (query.labels) params.set("labels", query.labels);
  if (query.since) params.set("since", query.since);
  if (query.assignee) params.set("assignee", query.assignee);
  if (query.creator) params.set("creator", query.creator);
  if (query.milestone) params.set("milestone", query.milestone);
  const repo = query.repo;
  const url = repo ? `https://api.github.com/repos/${encodeURI(repo)}/issues?${params.toString()}` : `https://api.github.com/issues?${params.toString()}`;
  let raws;
  try {
    raws = await $fetch(url, { headers });
  } catch (err) {
    console.error("[github/issues] Failed to list issues:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to list issues from GitHub." });
  }
  const onlyIssues = (raws || []).filter((r) => !r.pull_request);
  const issues = onlyIssues.map(normalizeIssue);
  return { issues };
});

export { issues_get as default };
//# sourceMappingURL=issues.get.mjs.map

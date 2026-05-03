import { d as defineEventHandler, h as getQuery, c as createError, P as requireConnectionOwner, Q as getValidAccessToken } from '../../../../nitro/nitro.mjs';
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

const labels_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const connectionId = query.connectionId;
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId query parameter." });
  }
  await requireConnectionOwner(event, connectionId);
  const accessToken = await getValidAccessToken(connectionId);
  try {
    const response = await $fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", { headers: { Authorization: `Bearer ${accessToken}` } });
    return { labels: response.labels || [] };
  } catch (err) {
    console.error("[gmail/labels] Failed to list labels:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to fetch labels from Gmail." });
  }
});

export { labels_get as default };
//# sourceMappingURL=labels.get.mjs.map

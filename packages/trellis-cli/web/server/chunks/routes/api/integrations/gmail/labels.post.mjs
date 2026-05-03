import { d as defineEventHandler, r as readBody, c as createError, P as requireConnectionOwner, Q as getValidAccessToken } from '../../../../nitro/nitro.mjs';
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

const labels_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.connectionId) || !body.action) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId or action." });
  }
  await requireConnectionOwner(event, body.connectionId);
  const accessToken = await getValidAccessToken(body.connectionId);
  const authHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  if (body.action === "create") {
    if (!body.name) {
      throw createError({ statusCode: 400, statusMessage: "Missing label name." });
    }
    try {
      const label = await $fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/labels",
        {
          method: "POST",
          headers: authHeaders,
          body: {
            name: body.name,
            labelListVisibility: body.labelListVisibility || "labelShow",
            messageListVisibility: body.messageListVisibility || "show"
          }
        }
      );
      return { ok: true, label };
    } catch (err) {
      console.error("[gmail/labels] Create failed:", (err == null ? void 0 : err.data) || err);
      throw createError({
        statusCode: 502,
        statusMessage: ((_b = (_a = err == null ? void 0 : err.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || "Failed to create label."
      });
    }
  }
  if (body.action === "modify") {
    if (!body.messageId && !body.threadId) {
      throw createError({ statusCode: 400, statusMessage: "Must provide messageId or threadId." });
    }
    const resource = body.threadId ? `threads/${encodeURIComponent(body.threadId)}/modify` : `messages/${encodeURIComponent(body.messageId)}/modify`;
    try {
      const result = await $fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${resource}`, {
        method: "POST",
        headers: authHeaders,
        body: {
          addLabelIds: body.addLabelIds || [],
          removeLabelIds: body.removeLabelIds || []
        }
      });
      return { ok: true, result };
    } catch (err) {
      console.error("[gmail/labels] Modify failed:", (err == null ? void 0 : err.data) || err);
      throw createError({
        statusCode: 502,
        statusMessage: ((_d = (_c = err == null ? void 0 : err.data) == null ? void 0 : _c.error) == null ? void 0 : _d.message) || "Failed to modify labels."
      });
    }
  }
  throw createError({ statusCode: 400, statusMessage: `Unknown action: ${body.action}` });
});

export { labels_post as default };
//# sourceMappingURL=labels.post.mjs.map

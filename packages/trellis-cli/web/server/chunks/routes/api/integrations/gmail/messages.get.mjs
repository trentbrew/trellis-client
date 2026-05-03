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

function getHeader(headers, name) {
  if (!headers) return "";
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return (h == null ? void 0 : h.value) || "";
}
function decodeBase64Url(data) {
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return "";
  }
}
function extractBody(payload) {
  if (!payload) return {};
  const result = {};
  const walk = (part) => {
    var _a, _b;
    if (part.mimeType === "text/plain" && ((_a = part.body) == null ? void 0 : _a.data) && !result.text) {
      result.text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && ((_b = part.body) == null ? void 0 : _b.data) && !result.html) {
      result.html = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub);
    }
  };
  walk(payload);
  return result;
}
function normalizeMessage(msg) {
  var _a;
  const headers = (_a = msg.payload) == null ? void 0 : _a.headers;
  const body = extractBody(msg.payload);
  const dateHeader = getHeader(headers, "Date");
  const internalDateMs = msg.internalDate ? Number(msg.internalDate) : 0;
  const date = dateHeader || (internalDateMs ? new Date(internalDateMs).toISOString() : "");
  return {
    id: msg.id,
    messageId: getHeader(headers, "Message-ID"),
    subject: getHeader(headers, "Subject"),
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc") || void 0,
    date,
    snippet: msg.snippet || "",
    labelIds: msg.labelIds || [],
    bodyText: body.text,
    bodyHtml: body.html
  };
}
const messages_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const connectionId = query.connectionId;
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId query parameter." });
  }
  await requireConnectionOwner(event, connectionId);
  const accessToken = await getValidAccessToken(connectionId);
  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const threadId = query.threadId;
  if (threadId) {
    try {
      const thread = await $fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
        { headers: authHeaders }
      );
      const normalized = {
        id: thread.id,
        labelIds: Array.from(new Set(thread.messages.flatMap((m) => m.labelIds || []))),
        messages: thread.messages.map(normalizeMessage)
      };
      return normalized;
    } catch (err) {
      console.error("[gmail/messages] Failed to fetch thread:", (err == null ? void 0 : err.data) || err);
      throw createError({ statusCode: 502, statusMessage: "Failed to fetch thread from Gmail." });
    }
  }
  const labelId = query.labelId || "INBOX";
  const maxResults = Number(query.maxResults) || 50;
  const q = query.q;
  const pageToken = query.pageToken;
  const listParams = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: labelId
  });
  if (q) listParams.set("q", q);
  if (pageToken) listParams.set("pageToken", pageToken);
  let listResponse;
  try {
    listResponse = await $fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?${listParams.toString()}`, {
      headers: authHeaders
    });
  } catch (err) {
    console.error("[gmail/messages] Failed to list threads:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to list threads from Gmail." });
  }
  const threadRefs = listResponse.threads || [];
  if (threadRefs.length === 0) {
    return { threads: [], nextPageToken: listResponse.nextPageToken };
  }
  const summaries = await Promise.all(
    threadRefs.map(async (ref) => {
      var _a;
      try {
        const thread = await $fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: authHeaders }
        );
        const messages = thread.messages || [];
        if (messages.length === 0) return null;
        const lastMsg = messages[messages.length - 1];
        const allLabels = Array.from(new Set(messages.flatMap((m) => m.labelIds || [])));
        const headers = (_a = lastMsg.payload) == null ? void 0 : _a.headers;
        const internalDateMs = lastMsg.internalDate ? Number(lastMsg.internalDate) : 0;
        return {
          id: thread.id,
          subject: getHeader(headers, "Subject"),
          from: getHeader(headers, "From"),
          snippet: ref.snippet || lastMsg.snippet || "",
          date: getHeader(headers, "Date") || (internalDateMs ? new Date(internalDateMs).toISOString() : ""),
          unread: allLabels.includes("UNREAD"),
          labelIds: allLabels
        };
      } catch (err) {
        console.warn("[gmail/messages] Failed to hydrate thread summary:", ref.id, err);
        return null;
      }
    })
  );
  return {
    threads: summaries.filter((s) => s !== null),
    nextPageToken: listResponse.nextPageToken,
    resultSizeEstimate: listResponse.resultSizeEstimate
  };
});

export { messages_get as default };
//# sourceMappingURL=messages.get.mjs.map

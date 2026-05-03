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

function base64UrlEncode(input) {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function buildMimeMessage(opts) {
  const lines = [];
  lines.push(`To: ${opts.to}`);
  if (opts.cc) lines.push(`Cc: ${opts.cc}`);
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push(`Content-Type: ${opts.isHtml ? "text/html" : "text/plain"}; charset="UTF-8"`);
  lines.push("Content-Transfer-Encoding: 7bit");
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);
  lines.push("");
  lines.push(opts.body);
  return lines.join("\r\n");
}
const send_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.connectionId) || !body.to || !body.subject) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: connectionId, to, subject."
    });
  }
  await requireConnectionOwner(event, body.connectionId);
  const accessToken = await getValidAccessToken(body.connectionId);
  const mime = buildMimeMessage(body);
  const raw = base64UrlEncode(mime);
  try {
    const response = await $fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: {
          raw,
          ...body.threadId ? { threadId: body.threadId } : {}
        }
      }
    );
    return { ok: true, messageId: response.id, threadId: response.threadId };
  } catch (err) {
    console.error("[gmail/send] Send failed:", (err == null ? void 0 : err.data) || err);
    throw createError({
      statusCode: 502,
      statusMessage: ((_b = (_a = err == null ? void 0 : err.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || "Failed to send message via Gmail."
    });
  }
});

export { send_post as default };
//# sourceMappingURL=send.post.mjs.map

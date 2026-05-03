import { d as defineEventHandler, r as readBody, c as createError, P as requireConnectionOwner, e as useTqlKernel } from '../../../../nitro/nitro.mjs';
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

const revoke_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.connectionId)) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId in request body." });
  }
  await requireConnectionOwner(event, body.connectionId);
  const kernel = useTqlKernel();
  const entityId = body.connectionId.startsWith("entity:") ? body.connectionId : `entity:${body.connectionId}`;
  const queryResult = kernel.query(`FIND entity AS ?c WHERE ?c["@id"] = "${entityId}" RETURN ?c.credentialsRef`);
  const rows = (queryResult == null ? void 0 : queryResult.data) || [];
  const credentialsRef = (_a = rows[0]) == null ? void 0 : _a["?c.credentialsRef"];
  if (credentialsRef) {
    try {
      const creds = JSON.parse(credentialsRef);
      if (creds.accessToken) {
        await $fetch(`https://oauth2.googleapis.com/revoke?token=${creds.accessToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }).catch((err) => {
          var _a2;
          console.warn("[gcal/revoke] Google token revocation failed (non-fatal):", ((_a2 = err == null ? void 0 : err.data) == null ? void 0 : _a2.error) || err);
        });
      }
    } catch {
      console.warn("[gcal/revoke] Failed to parse credentials \u2014 skipping Google revocation");
    }
  }
  await kernel.deleteNode(body.connectionId);
  console.log(`[gcal/revoke] Disconnected and deleted ${body.connectionId}`);
  return { ok: true };
});

export { revoke_post as default };
//# sourceMappingURL=revoke.post.mjs.map

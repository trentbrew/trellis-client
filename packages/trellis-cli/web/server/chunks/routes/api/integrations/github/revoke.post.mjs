import { d as defineEventHandler, r as readBody, c as createError, P as requireConnectionOwner, e as useTqlKernel, M as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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
  const config = useRuntimeConfig();
  const clientId = config.public.githubClientId;
  const clientSecret = config.githubClientSecret;
  const kernel = useTqlKernel();
  const entityId = body.connectionId.startsWith("entity:") ? body.connectionId : `entity:${body.connectionId}`;
  const facts = kernel.getStore().getFactsByEntity(entityId);
  const credentialsRef = (_a = facts.find((f) => f.a === "credentialsRef")) == null ? void 0 : _a.v;
  if (credentialsRef && clientId && clientSecret) {
    try {
      const creds = JSON.parse(credentialsRef);
      if (creds.accessToken) {
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        await $fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/grant`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${basic}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Trellis-Client"
          },
          body: { access_token: creds.accessToken }
        }).catch((err) => {
          console.warn("[github/revoke] GitHub token revocation failed (non-fatal):", (err == null ? void 0 : err.data) || (err == null ? void 0 : err.message));
        });
      }
    } catch {
      console.warn("[github/revoke] Failed to parse credentials \u2014 skipping GitHub revocation");
    }
  }
  await kernel.deleteNode(body.connectionId);
  console.log(`[github/revoke] Disconnected and deleted ${body.connectionId}`);
  return { ok: true };
});

export { revoke_post as default };
//# sourceMappingURL=revoke.post.mjs.map

import { d as defineEventHandler, c as createError, r as readBody, V as updateNotificationStatus } from '../../../nitro/nitro.mjs';
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

const _id__patch = defineEventHandler(async (event) => {
  var _a;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) throw createError({ statusCode: 400, message: "Missing notification id" });
  const body = await readBody(event);
  const { agentId, ...patch } = body || {};
  await updateNotificationStatus(id, patch, { agentId: agentId || "browser" });
  return { ok: true, id };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map

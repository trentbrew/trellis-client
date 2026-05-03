import { d as defineEventHandler, c as createError, h as getQuery, U as deleteNotification } from '../../../nitro/nitro.mjs';
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

const _id__delete = defineEventHandler(async (event) => {
  var _a, _b;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) throw createError({ statusCode: 400, message: "Missing notification id" });
  const agentId = ((_b = getQuery(event).agentId) == null ? void 0 : _b.toString()) || "browser";
  await deleteNotification(id, { agentId });
  return { ok: true, id };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map

import { d as defineEventHandler, T as parseApiRouterParams, at as getTrigger, c as createError, ar as WorkflowTriggerIdParamsSchema } from '../../../../nitro/nitro.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema);
  const trigger = await getTrigger(id);
  if (!trigger) throw createError({ statusCode: 404, message: `Trigger ${id} not found` });
  return { ok: true, trigger };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map

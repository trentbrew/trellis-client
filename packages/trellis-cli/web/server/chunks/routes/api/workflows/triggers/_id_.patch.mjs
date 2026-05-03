import { d as defineEventHandler, T as parseApiRouterParams, n as parseApiBody, au as updateTrigger, c as createError, ar as WorkflowTriggerIdParamsSchema, av as WorkflowTriggerUpdateBodySchema } from '../../../../nitro/nitro.mjs';
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
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema);
  const body = await parseApiBody(event, WorkflowTriggerUpdateBodySchema);
  try {
    const trigger = await updateTrigger(id, body, { agentId: body.agentId });
    return { ok: true, trigger };
  } catch (err) {
    throw createError({ statusCode: 400, message: (err == null ? void 0 : err.message) || "updateTrigger failed" });
  }
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map

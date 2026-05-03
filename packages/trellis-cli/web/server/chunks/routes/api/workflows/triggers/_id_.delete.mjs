import { d as defineEventHandler, T as parseApiRouterParams, k as parseApiQuery, aq as deleteTrigger, ar as WorkflowTriggerIdParamsSchema, as as WorkflowTriggerDeleteQuerySchema } from '../../../../nitro/nitro.mjs';
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
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema);
  const { agentId } = parseApiQuery(event, WorkflowTriggerDeleteQuerySchema);
  await deleteTrigger(id, { agentId });
  return { ok: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map

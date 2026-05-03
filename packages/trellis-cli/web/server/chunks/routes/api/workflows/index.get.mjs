import { d as defineEventHandler, k as parseApiQuery, ah as listTriggers, ay as WorkflowTriggerListQuerySchema } from '../../../nitro/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  const { kind, workflowId, activeOnly } = parseApiQuery(event, WorkflowTriggerListQuerySchema);
  const triggers = await listTriggers({ kind, workflowId, activeOnly });
  return { ok: true, triggers };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map

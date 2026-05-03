import { d as defineEventHandler, n as parseApiBody, az as createTrigger, c as createError, aA as WorkflowTriggerCreateBodySchema } from '../../../nitro/nitro.mjs';
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

const index_post = defineEventHandler(async (event) => {
  const body = await parseApiBody(event, WorkflowTriggerCreateBodySchema);
  try {
    const trigger = await createTrigger(body, { agentId: body.agentId });
    return { ok: true, trigger };
  } catch (err) {
    throw createError({
      statusCode: 400,
      message: (err == null ? void 0 : err.message) || "createTrigger failed"
    });
  }
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map

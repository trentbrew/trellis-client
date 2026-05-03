import { d as defineEventHandler, n as parseApiBody, ak as executeWorkflow, c as createError, al as WorkflowExecuteBodySchema } from '../../../nitro/nitro.mjs';
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

const execute_post = defineEventHandler(async (event) => {
  const body = await parseApiBody(event, WorkflowExecuteBodySchema);
  try {
    const run = await executeWorkflow({
      workflowId: body.workflowId,
      workflowName: body.workflowName,
      graph: body.graph,
      input: body.input,
      agentId: body.agentId,
      skipPersist: body.skipPersist,
      defaultModel: body.defaultModel,
      ownerId: body.ownerId,
      orgId: body.orgId,
      notifyOnSuccess: body.notifyOnSuccess
    });
    return { ok: true, run };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: `executeWorkflow failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { execute_post as default };
//# sourceMappingURL=execute.post.mjs.map

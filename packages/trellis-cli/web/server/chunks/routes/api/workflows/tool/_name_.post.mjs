import { d as defineEventHandler, T as parseApiRouterParams, c as createError, n as parseApiBody, am as invokeWorkflowTool, an as listWorkflowTools, ao as WorkflowToolNameParamsSchema, ap as WorkflowToolInvokeBodySchema } from '../../../../nitro/nitro.mjs';
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

const _name__post = defineEventHandler(async (event) => {
  var _a;
  const { name } = parseApiRouterParams(event, WorkflowToolNameParamsSchema);
  const available = listWorkflowTools();
  if (!available.includes(name)) {
    throw createError({
      statusCode: 404,
      message: `Unknown tool: ${name}. Available: ${available.join(", ")}`
    });
  }
  const body = await parseApiBody(event, WorkflowToolInvokeBodySchema);
  try {
    const result = await invokeWorkflowTool(name, (_a = body.args) != null ? _a : {}, {
      agentId: body.agentId,
      workflowId: body.workflowId
    });
    return { ok: true, name, result };
  } catch (err) {
    return { ok: false, name, error: (err == null ? void 0 : err.message) || String(err) };
  }
});

export { _name__post as default };
//# sourceMappingURL=_name_.post.mjs.map

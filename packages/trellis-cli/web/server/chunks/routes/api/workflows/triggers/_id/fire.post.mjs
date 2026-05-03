import { d as defineEventHandler, T as parseApiRouterParams, at as getTrigger, c as createError, n as parseApiBody, ak as executeWorkflow, aw as recordTriggerFire, ar as WorkflowTriggerIdParamsSchema, ax as WorkflowTriggerFireBodySchema } from '../../../../../nitro/nitro.mjs';
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

const fire_post = defineEventHandler(async (event) => {
  var _a;
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema);
  const trigger = await getTrigger(id);
  if (!trigger) throw createError({ statusCode: 404, message: `Trigger ${id} not found` });
  const body = await parseApiBody(event, WorkflowTriggerFireBodySchema);
  const agentId = body.agentId || trigger.agentId || `trigger:${trigger.kind}:manual`;
  const input = (_a = body.input) != null ? _a : {
    trigger: {
      id: trigger.id,
      kind: trigger.kind,
      manual: true,
      firedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  try {
    const run = await executeWorkflow({
      workflowId: trigger.workflowId,
      workflowName: trigger.workflowName,
      graph: trigger.graph,
      input,
      agentId,
      ownerId: trigger.ownerId,
      orgId: trigger.orgId,
      notifyOnSuccess: trigger.notifyOnSuccess
    });
    await recordTriggerFire(trigger.id, {
      runId: run.id,
      error: run.status === "failed" ? run.error || "run failed" : void 0
    });
    return { ok: true, run };
  } catch (err) {
    const msg = (err == null ? void 0 : err.message) || String(err);
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {
    });
    throw createError({ statusCode: 500, message: `Trigger fire failed: ${msg}` });
  }
});

export { fire_post as default };
//# sourceMappingURL=fire.post.mjs.map

import { d as defineEventHandler, T as parseApiRouterParams, aB as findWebhookTrigger, c as createError, n as parseApiBody, aC as getRequestHeaders, ak as executeWorkflow, aw as recordTriggerFire, aD as WorkflowWebhookTokenParamsSchema, aE as WorkflowWebhookPayloadSchema } from '../../../../nitro/nitro.mjs';
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

const _token__post = defineEventHandler(async (event) => {
  var _a;
  const { token } = parseApiRouterParams(event, WorkflowWebhookTokenParamsSchema);
  const trigger = await findWebhookTrigger(token);
  if (!trigger) {
    throw createError({ statusCode: 404, message: "Webhook trigger not found or disabled" });
  }
  const payload = (_a = await parseApiBody(event, WorkflowWebhookPayloadSchema)) != null ? _a : null;
  const headers = getRequestHeaders(event);
  const method = event.method;
  const agentId = trigger.agentId || "trigger:webhook";
  const input = {
    trigger: {
      id: trigger.id,
      kind: "webhook",
      token,
      method,
      headers,
      payload,
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
    return { ok: true, runId: run.id, status: run.status, stepCount: run.stepCount };
  } catch (err) {
    const msg = (err == null ? void 0 : err.message) || String(err);
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {
    });
    throw createError({ statusCode: 500, message: `Webhook execution failed: ${msg}` });
  }
});

export { _token__post as default };
//# sourceMappingURL=_token_.post.mjs.map

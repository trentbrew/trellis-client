import { d as defineEventHandler, s as setResponseHeaders, J as onMutation } from '../../../nitro/nitro.mjs';
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

const events_get = defineEventHandler(async (event) => {
  var _a;
  const res = event.node.res;
  setResponseHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  (_a = res.flushHeaders) == null ? void 0 : _a.call(res);
  res.write(`event: connected
data: ${JSON.stringify({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keep-alive

`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 3e4);
  const unsubscribe = onMutation((mutation) => {
    try {
      const payload = JSON.stringify(mutation);
      res.write(`id: ${mutation.id}
event: mutation
data: ${payload}

`);
    } catch {
      clearInterval(keepAlive);
      unsubscribe();
    }
  });
  event.node.req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
  await new Promise((resolve) => {
    event.node.req.on("close", resolve);
  });
});

export { events_get as default };
//# sourceMappingURL=events.get.mjs.map

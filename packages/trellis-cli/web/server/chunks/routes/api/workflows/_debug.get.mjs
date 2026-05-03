import { d as defineEventHandler, ah as listTriggers, ai as isCronDue, aj as getListenerCount } from '../../../nitro/nitro.mjs';
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

const _debug_get = defineEventHandler(async () => {
  const all = await listTriggers();
  const byKind = {};
  for (const t of all) {
    byKind[t.kind] = (byKind[t.kind] || 0) + 1;
  }
  const activeSchedule = all.filter((t) => t.active && t.kind === "schedule");
  const now = /* @__PURE__ */ new Date();
  const dueNow = activeSchedule.filter((t) => t.cron && isCronDue(t.cron, now));
  return {
    ok: true,
    mutationListeners: getListenerCount(),
    triggers: {
      total: all.length,
      byKind,
      activeSchedule: activeSchedule.length,
      dueRightNow: dueNow.length,
      dueRightNowIds: dueNow.map((t) => t.id)
    },
    now: now.toISOString()
  };
});

export { _debug_get as default };
//# sourceMappingURL=_debug.get.mjs.map

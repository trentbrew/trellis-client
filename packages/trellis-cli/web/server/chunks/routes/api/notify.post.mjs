import { d as defineEventHandler, r as readBody, c as createError, u as useInstantAdmin, g as dispatchNotificationEmailAsync } from '../../nitro/nitro.mjs';
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

const notify_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.orgId) || !(body == null ? void 0 : body.type) || !(body == null ? void 0 : body.title) || !(body == null ? void 0 : body.message)) {
    throw createError({ statusCode: 400, message: "orgId, type, title, and message are required" });
  }
  const recipientIds = ((_a = body.recipients) == null ? void 0 : _a.length) ? body.recipients : body.recipientId ? [body.recipientId] : [];
  if (!recipientIds.length) {
    throw createError({ statusCode: 400, message: "recipientId or recipients[] is required" });
  }
  const db = useInstantAdmin();
  const now = Date.now();
  const created = [];
  for (const recipientId of recipientIds) {
    try {
      const notifId = crypto.randomUUID();
      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId: body.orgId,
          orgName: body.orgName || "",
          type: body.type,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl || "",
          icon: body.icon || "",
          variant: body.variant || "default",
          isRead: false,
          actorId: body.actorId || "",
          actorName: body.actorName || "",
          metadata: body.metadata || {},
          createdAt: now
        })
      );
      try {
        await db.transact(db.tx.organizations[body.orgId].link({ notifications: notifId }));
      } catch (linkErr) {
        console.warn(`[notify] Org link failed for notification ${notifId} (non-fatal):`, linkErr == null ? void 0 : linkErr.message);
      }
      if (!body.skipEmail) {
        dispatchNotificationEmailAsync({
          recipientId,
          type: body.type,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl,
          actorName: body.actorName,
          orgName: body.orgName,
          metadata: body.metadata
        });
      }
      created.push(notifId);
    } catch (err) {
      console.error(`[notify] Failed to create notification for ${recipientId}:`, err == null ? void 0 : err.message);
    }
  }
  return {
    ok: true,
    created: created.length,
    ids: created
  };
});

export { notify_post as default };
//# sourceMappingURL=notify.post.mjs.map

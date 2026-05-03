import { d as defineEventHandler, r as readBody, c as createError, u as useInstantAdmin, g as dispatchNotificationEmailAsync } from '../../../nitro/nitro.mjs';
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

const notifyMessage_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.channelId) || !(body == null ? void 0 : body.orgId) || !(body == null ? void 0 : body.authorId)) {
    throw createError({ statusCode: 400, message: "channelId, orgId, and authorId are required" });
  }
  const db = useInstantAdmin();
  const now = Date.now();
  const membersResult = await db.query({
    members: {
      $: {
        where: {
          orgId: body.orgId,
          status: "active"
        }
      }
    }
  });
  const skipSet = new Set((_a = body.skipUserIds) != null ? _a : []);
  const members = ((membersResult == null ? void 0 : membersResult.members) || []).filter(
    (m) => m.userId && m.userId !== body.authorId && !skipSet.has(m.userId)
  );
  if (members.length === 0) return { ok: true, created: 0 };
  const recipientIds = members.map((m) => m.userId);
  const prefsResult = await db.query({
    chatNotificationPrefs: {
      $: {
        where: {
          userId: { in: recipientIds }
        }
      }
    }
  });
  const prefs = (prefsResult == null ? void 0 : prefsResult.chatNotificationPrefs) || [];
  function effectiveLevel(userId) {
    var _a2;
    const channelPref = prefs.find((p) => p.userId === userId && p.channelId === body.channelId);
    if (channelPref) return channelPref.level;
    const globalPref = prefs.find((p) => p.userId === userId && !p.channelId);
    return (_a2 = globalPref == null ? void 0 : globalPref.level) != null ? _a2 : "all";
  }
  const created = [];
  const snippet = body.content.length > 80 ? body.content.slice(0, 80) + "\u2026" : body.content;
  for (const recipientId of recipientIds) {
    if (effectiveLevel(recipientId) === "none") continue;
    try {
      const notifId = crypto.randomUUID();
      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId: body.orgId,
          type: "new_message",
          title: `#${body.channelTitle}`,
          message: `${body.authorName}: ${snippet}`,
          actionUrl: `/messages/${body.channelId}`,
          icon: "lucide:message-square",
          variant: "default",
          isRead: false,
          actorId: body.authorId,
          actorName: body.authorName,
          metadata: { channelId: body.channelId },
          createdAt: now
        })
      );
      created.push(notifId);
      dispatchNotificationEmailAsync({
        recipientId,
        type: "new_message",
        title: `#${body.channelTitle}`,
        message: `${body.authorName}: ${snippet}`,
        actionUrl: `/messages/${body.channelId}`,
        actorName: body.authorName,
        metadata: { channelId: body.channelId, channelTitle: body.channelTitle }
      });
    } catch (err) {
      console.warn(`[chat/notify-message] Failed for ${recipientId}:`, err == null ? void 0 : err.message);
    }
  }
  return { ok: true, created: created.length };
});

export { notifyMessage_post as default };
//# sourceMappingURL=notify-message.post.mjs.map

import { d as defineEventHandler, r as readBody, c as createError, u as useInstantAdmin } from '../../nitro/nitro.mjs';
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

const resolveInvites_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.userId) || !(body == null ? void 0 : body.email)) {
    throw createError({ statusCode: 400, message: "userId and email are required" });
  }
  const db = useInstantAdmin();
  const email = body.email.trim().toLowerCase();
  try {
    const result = await db.query({
      members: {
        $: {
          where: {
            email,
            status: "pending"
          }
        }
      }
    });
    const pendingMembers = (result == null ? void 0 : result.members) || [];
    if (pendingMembers.length === 0) {
      return { resolved: 0, memberships: [] };
    }
    const memberships = [];
    for (const member of pendingMembers) {
      try {
        await db.transact(
          db.tx.members[member.id].update({
            userId: body.userId,
            status: "active"
          })
        );
        if (member.orgId) {
          try {
            await db.transact(
              db.tx.organizations[member.orgId].link({ members: member.id })
            );
          } catch (linkErr) {
            console.warn(`[resolve-invites] Org\u2192member link failed for ${member.id} (non-fatal):`, linkErr == null ? void 0 : linkErr.message);
          }
        }
        memberships.push({
          orgId: member.orgId,
          worldId: member.worldId || void 0,
          role: member.role || "member"
        });
      } catch (err) {
        console.warn(`[resolve-invites] Failed to resolve member ${member.id}:`, err == null ? void 0 : err.message);
      }
    }
    for (const member of pendingMembers) {
      if (!member.orgId) continue;
      try {
        const orgName = member.orgName || "your workspace";
        const inviteeName = body.email.split("@")[0] || body.email;
        if (member.ownerId) {
          const notifId = crypto.randomUUID();
          await db.transact(
            db.tx.notifications[notifId].update({
              recipientId: member.ownerId,
              orgId: member.orgId,
              orgName,
              type: "invite_accepted",
              title: "Invite accepted",
              message: `${inviteeName} accepted your invitation to ${orgName}.`,
              actionUrl: "/settings/members",
              icon: "lucide:user-check",
              variant: "success",
              isRead: false,
              actorId: body.userId,
              actorName: inviteeName,
              metadata: { memberEmail: body.email },
              createdAt: Date.now()
            })
          );
          try {
            await db.transact(db.tx.organizations[member.orgId].link({ notifications: notifId }));
          } catch {
          }
        }
        const allMembersResult = await db.query({
          members: {
            $: {
              where: {
                orgId: member.orgId,
                status: "active"
              }
            }
          }
        });
        const peers = ((allMembersResult == null ? void 0 : allMembersResult.members) || []).filter((a) => a.userId && a.userId !== body.userId && a.userId !== member.ownerId);
        for (const peer of peers) {
          const peerNotifId = crypto.randomUUID();
          await db.transact(
            db.tx.notifications[peerNotifId].update({
              recipientId: peer.userId,
              orgId: member.orgId,
              orgName,
              type: "member_joined",
              title: "New member joined",
              message: `${inviteeName} joined ${orgName}.`,
              actionUrl: "/settings/members",
              icon: "lucide:user-plus",
              variant: "default",
              isRead: false,
              actorId: body.userId,
              actorName: inviteeName,
              metadata: { memberEmail: body.email },
              createdAt: Date.now()
            })
          );
          try {
            await db.transact(db.tx.organizations[member.orgId].link({ notifications: peerNotifId }));
          } catch {
          }
        }
      } catch (notifErr) {
        console.warn("[resolve-invites] Notification creation failed (non-fatal):", notifErr == null ? void 0 : notifErr.message);
      }
    }
    if (memberships.length > 0) {
      const primaryOrgId = memberships[0].orgId;
      const userId = body.userId;
      const now = Date.now();
      const upsertSetting = async (key, value) => {
        const settingKey = `user:${userId}:${key}`;
        const existing = await db.query({
          settings: { $: { where: { settingKey } } }
        });
        const found = ((existing == null ? void 0 : existing.settings) || [])[0];
        if (found == null ? void 0 : found.id) {
          await db.transact(
            db.tx.settings[found.id].update({ value, updatedAt: now })
          );
        } else {
          const id = crypto.randomUUID();
          await db.transact(
            db.tx.settings[id].create({
              ownerId: userId,
              settingKey,
              entityType: "user",
              entityId: userId,
              key,
              value,
              updatedAt: now
            })
          );
        }
      };
      try {
        await upsertSetting("lastOrgId", primaryOrgId);
        const primaryWorldId = memberships[0].worldId;
        if (primaryWorldId) {
          await upsertSetting("lastAppId", primaryWorldId);
        }
        await upsertSetting("onboardingComplete", true);
      } catch (settingErr) {
        console.warn("[resolve-invites] Failed to upsert workspace settings (non-fatal):", settingErr == null ? void 0 : settingErr.message);
      }
    }
    return {
      resolved: memberships.length,
      memberships
    };
  } catch (err) {
    console.error("[resolve-invites] Error:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, message: "Failed to resolve invites" });
  }
});

export { resolveInvites_post as default };
//# sourceMappingURL=resolve-invites.post.mjs.map

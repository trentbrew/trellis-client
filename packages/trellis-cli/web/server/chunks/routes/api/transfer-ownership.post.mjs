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

const transferOwnership_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.orgId) || !(body == null ? void 0 : body.currentOwnerId) || !(body == null ? void 0 : body.newOwnerId)) {
    throw createError({ statusCode: 400, message: "orgId, currentOwnerId, and newOwnerId are required" });
  }
  if (body.currentOwnerId === body.newOwnerId) {
    throw createError({ statusCode: 400, message: "Cannot transfer ownership to yourself" });
  }
  const db = useInstantAdmin();
  try {
    const orgResult = await db.query({
      organizations: {
        $: { where: { id: body.orgId } }
      }
    });
    const org = (_a = orgResult == null ? void 0 : orgResult.organizations) == null ? void 0 : _a[0];
    if (!org) {
      throw createError({ statusCode: 404, message: "Organization not found" });
    }
    if (org.ownerId !== body.currentOwnerId) {
      throw createError({ statusCode: 403, message: "Only the current owner can transfer ownership" });
    }
    const membersResult = await db.query({
      members: {
        $: { where: { orgId: body.orgId } }
      }
    });
    const allMembers = (membersResult == null ? void 0 : membersResult.members) || [];
    const currentOwnerMember = allMembers.find(
      (m) => m.userId === body.currentOwnerId && m.role === "owner"
    );
    const newOwnerMember = allMembers.find(
      (m) => m.userId === body.newOwnerId && m.status === "active"
    );
    if (!newOwnerMember) {
      throw createError({ statusCode: 404, message: "Target member not found or not active" });
    }
    const txOps = [
      // Update org.ownerId
      db.tx.organizations[body.orgId].update({ ownerId: body.newOwnerId }),
      // Promote new owner
      db.tx.members[newOwnerMember.id].update({ role: "owner" })
    ];
    if (currentOwnerMember) {
      txOps.push(db.tx.members[currentOwnerMember.id].update({ role: "admin" }));
    }
    await db.transact(txOps);
    const now = Date.now();
    const orgName = org.name || org.slug || "Workspace";
    const newOwnerNotifId = crypto.randomUUID();
    await db.transact([
      db.tx.notifications[newOwnerNotifId].update({
        recipientId: body.newOwnerId,
        orgId: body.orgId,
        orgName,
        type: "role_changed",
        title: "You are now the workspace owner",
        message: `Ownership of "${orgName}" has been transferred to you.`,
        icon: "lucide:shield",
        variant: "success",
        isRead: false,
        actorId: body.currentOwnerId,
        createdAt: now
      })
    ]);
    const prevOwnerNotifId = crypto.randomUUID();
    await db.transact([
      db.tx.notifications[prevOwnerNotifId].update({
        recipientId: body.currentOwnerId,
        orgId: body.orgId,
        orgName,
        type: "role_changed",
        title: "Ownership transferred",
        message: `You transferred ownership of "${orgName}". Your role is now Admin.`,
        icon: "lucide:shield",
        variant: "info",
        isRead: false,
        actorId: body.currentOwnerId,
        createdAt: now
      })
    ]);
    return {
      success: true,
      newOwnerId: body.newOwnerId,
      previousOwnerId: body.currentOwnerId
    };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("[transfer-ownership] error:", err);
    throw createError({
      statusCode: 500,
      message: (err == null ? void 0 : err.message) || "Failed to transfer ownership"
    });
  }
});

export { transferOwnership_post as default };
//# sourceMappingURL=transfer-ownership.post.mjs.map

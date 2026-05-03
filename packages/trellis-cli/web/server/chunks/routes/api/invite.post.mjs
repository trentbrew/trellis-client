import { d as defineEventHandler, w as getRequestURL, r as readBody, c as createError, u as useInstantAdmin, R as sendEmail, S as inviteEmailHtml } from '../../nitro/nitro.mjs';
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

const invite_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const reqUrl = getRequestURL(event);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
  const body = await readBody(event);
  if (!((_a = body == null ? void 0 : body.emails) == null ? void 0 : _a.length)) {
    throw createError({ statusCode: 400, message: "emails[] is required" });
  }
  if (!body.orgId || !body.inviterId) {
    throw createError({ statusCode: 400, message: "orgId and inviterId are required" });
  }
  const db = useInstantAdmin();
  const results = [];
  let inviterEmail = null;
  try {
    const inviterResp = await db.auth.getUser({ id: body.inviterId });
    inviterEmail = ((_c = (_b = inviterResp == null ? void 0 : inviterResp.user) == null ? void 0 : _b.email) == null ? void 0 : _c.toLowerCase()) || null;
  } catch {
  }
  for (const rawEmail of body.emails) {
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      results.push({ email: rawEmail, status: "error", message: "Invalid email" });
      continue;
    }
    if (inviterEmail && email === inviterEmail) {
      results.push({ email, status: "error", message: "You cannot invite yourself" });
      continue;
    }
    try {
      const existing = await db.query({
        members: {
          $: {
            where: {
              orgId: body.orgId,
              email
            }
          }
        }
      });
      const existingMembers = (existing == null ? void 0 : existing.members) || [];
      if (existingMembers.length > 0) {
        results.push({ email, status: "already_member", message: "Already invited" });
        continue;
      }
      const memberId = crypto.randomUUID();
      const inviteToken = crypto.randomUUID();
      const now = Date.now();
      await db.transact(
        db.tx.members[memberId].update({
          ownerId: body.inviterId,
          orgId: body.orgId,
          worldId: body.worldId || body.appId || "",
          userId: "",
          // Will be filled when they accept
          email,
          name: "",
          role: body.role || "member",
          status: "pending",
          invitedAt: now,
          inviteToken,
          inviterName: body.inviterName || "",
          orgName: body.orgName || "",
          worldName: body.worldName || ""
        })
      );
      try {
        await db.transact(
          db.tx.organizations[body.orgId].link({ members: memberId })
        );
      } catch (linkErr) {
        console.warn(`[invite] Org link failed for ${email} (non-fatal):`, linkErr == null ? void 0 : linkErr.message);
      }
      if (body.role === "guest" && ((_d = body.sharedEntityIds) == null ? void 0 : _d.length)) {
        for (const entityId of body.sharedEntityIds) {
          try {
            const shareId = crypto.randomUUID();
            await db.transact([
              db.tx.shares[shareId].update({
                entityId,
                entityType: "entity",
                userId: memberId,
                // placeholder — updated on accept
                orgId: body.orgId,
                permission: "view",
                sharedBy: body.inviterId,
                sharedByName: body.inviterName || "",
                createdAt: now
              }),
              db.tx.entities[entityId].link({ shares: shareId }),
              db.tx.organizations[body.orgId].link({ shares: shareId })
            ]);
          } catch (shareErr) {
            console.warn(`[invite] Share creation failed for entity ${entityId} (non-fatal):`, shareErr == null ? void 0 : shareErr.message);
          }
        }
      }
      const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}`;
      sendEmail({
        to: email,
        subject: `You've been invited to ${body.orgName || "a Trellis workspace"}`,
        html: inviteEmailHtml({
          inviterName: body.inviterName || "A teammate",
          orgName: body.orgName || "a workspace",
          inviteUrl
        })
      }).catch((err) => {
        console.warn(`[invite] Email send failed for ${email} (non-fatal):`, err == null ? void 0 : err.message);
      });
      results.push({ email, status: "sent", inviteToken, inviteUrl });
    } catch (err) {
      console.error(`[invite] Failed for ${email}:`, (err == null ? void 0 : err.message) || err);
      results.push({ email, status: "error", message: (err == null ? void 0 : err.message) || "Unknown error" });
    }
  }
  return {
    ok: true,
    results,
    summary: {
      sent: results.filter((r) => r.status === "sent").length,
      alreadyMember: results.filter((r) => r.status === "already_member").length,
      errors: results.filter((r) => r.status === "error").length
    }
  };
});

export { invite_post as default };
//# sourceMappingURL=invite.post.mjs.map

import { d as defineEventHandler, T as parseApiRouterParams, u as useInstantAdmin, c as createError } from '../../../nitro/nitro.mjs';
import { z } from 'zod';
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

const InviteTokenParamsSchema = z.object({
  token: z.string().trim().min(1, "Invite token is required")
});
const _token__get = defineEventHandler(async (event) => {
  const { token } = parseApiRouterParams(event, InviteTokenParamsSchema);
  const db = useInstantAdmin();
  try {
    const result = await db.query({
      members: {
        $: {
          where: {
            inviteToken: token
          }
        }
      }
    });
    const members = (result == null ? void 0 : result.members) || [];
    if (members.length === 0) {
      throw createError({ statusCode: 404, message: "Invite not found or has expired" });
    }
    const member = members[0];
    if (member.status === "active") {
      return {
        ok: true,
        status: "already_accepted",
        invite: {
          email: member.email,
          orgName: member.orgName || "a workspace",
          worldName: member.worldName || "",
          inviterName: member.inviterName || "Someone",
          role: member.role || "member"
        }
      };
    }
    return {
      ok: true,
      status: "pending",
      invite: {
        email: member.email,
        orgName: member.orgName || "a workspace",
        worldName: member.worldName || "",
        inviterName: member.inviterName || "Someone",
        role: member.role || "member",
        orgId: member.orgId,
        worldId: member.worldId || ""
      }
    };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("[invite/token] Error:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, message: "Failed to look up invite" });
  }
});

export { InviteTokenParamsSchema, _token__get as default };
//# sourceMappingURL=_token_.get.mjs.map

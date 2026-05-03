import { d as defineEventHandler, k as parseApiQuery, u as useInstantAdmin, c as createError } from '../../nitro/nitro.mjs';
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

const MembershipsQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email("email query param must be a valid email")
});
const memberships_get = defineEventHandler(async (event) => {
  const { email } = parseApiQuery(event, MembershipsQuerySchema);
  const db = useInstantAdmin();
  try {
    const result = await db.query({
      members: {
        $: {
          where: { email }
        }
      }
    });
    const members = (result == null ? void 0 : result.members) || [];
    return {
      ok: true,
      memberships: members.map((m) => ({
        id: m.id,
        orgId: m.orgId,
        orgName: m.orgName || "",
        role: m.role || "member",
        status: m.status,
        inviterName: m.inviterName || ""
      }))
    };
  } catch (err) {
    console.error("[memberships] Error:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, message: "Failed to fetch memberships" });
  }
});

export { MembershipsQuerySchema, memberships_get as default };
//# sourceMappingURL=memberships.get.mjs.map

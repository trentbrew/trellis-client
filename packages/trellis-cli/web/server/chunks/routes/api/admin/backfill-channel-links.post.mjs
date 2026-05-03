import { d as defineEventHandler, u as useInstantAdmin } from '../../../nitro/nitro.mjs';
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

const backfillChannelLinks_post = defineEventHandler(async (_event) => {
  var _a;
  const db = useInstantAdmin();
  const { data } = await db.query({ channels: {} });
  const channels = (_a = data == null ? void 0 : data.channels) != null ? _a : [];
  const toLink = channels.filter((c) => c.orgId);
  if (toLink.length === 0) {
    return { linked: 0, message: "No channels to backfill" };
  }
  const txns = toLink.map(
    (ch) => db.tx.organizations[ch.orgId].link({ channels: ch.id })
  );
  await db.transact(txns);
  return {
    linked: toLink.length,
    channelIds: toLink.map((c) => c.id),
    message: `Linked ${toLink.length} channel(s) to their organizations`
  };
});

export { backfillChannelLinks_post as default };
//# sourceMappingURL=backfill-channel-links.post.mjs.map

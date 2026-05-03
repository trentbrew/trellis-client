import { d as defineEventHandler, n as parseApiBody, W as createNotification } from '../../nitro/nitro.mjs';
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

const NotificationActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["link", "dismiss", "snooze", "mark_read", "workflow", "create_entity", "api"]),
  target: z.string().optional(),
  minutes: z.number().optional(),
  workflow: z.string().optional(),
  entityType: z.string().optional(),
  entitySeed: z.record(z.string(), z.unknown()).optional(),
  apiPath: z.string().optional(),
  apiMethod: z.enum(["GET", "POST", "PATCH", "DELETE"]).optional(),
  apiBody: z.record(z.string(), z.unknown()).optional(),
  icon: z.string().optional(),
  closesNotification: z.boolean().optional()
});
const CreateNotificationBodySchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  body: z.string().optional(),
  kind: z.enum(["success", "error", "warning", "info", "reminder", "email", "calendar", "alert", "ops", "job"]),
  source: z.enum(["system", "email", "calendar", "graph", "job", "ops", "workflow", "ai", "user"]),
  sourceId: z.string().optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sound: z.enum(["success", "fail", "reminder", "email", "none"]).optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  url: z.string().optional(),
  actions: z.array(NotificationActionSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  groupKey: z.string().optional(),
  agentId: z.string().optional()
});
const index_post = defineEventHandler(async (event) => {
  const body = await parseApiBody(event, CreateNotificationBodySchema);
  const agentId = body.agentId || "browser";
  const notification = await createNotification(body, { agentId });
  return { ok: true, notification };
});

export { CreateNotificationBodySchema, NotificationActionSchema, index_post as default };
//# sourceMappingURL=index.post.mjs.map

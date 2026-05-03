import { d as defineEventHandler, ag as readMultipartFormData, c as createError, u as useInstantAdmin } from '../../../nitro/nitro.mjs';
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

const upload_post = defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file provided" });
  }
  const filePart = formData.find((p) => p.name === "file");
  const pathPart = formData.find((p) => p.name === "path");
  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "file" field' });
  }
  if (!pathPart || !pathPart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' });
  }
  const storagePath = pathPart.data.toString("utf-8");
  const contentType = filePart.type || "application/octet-stream";
  const filename = filePart.filename || "upload";
  if (!storagePath || storagePath.includes("..") || storagePath.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage path" });
  }
  try {
    const db = useInstantAdmin();
    const fileBytes = new Uint8Array(filePart.data);
    await db.storage.uploadFile(storagePath, fileBytes, { contentType });
    const downloadUrl = await db.storage.getDownloadUrl(storagePath);
    return {
      url: downloadUrl || "",
      path: storagePath,
      filename,
      contentType,
      size: fileBytes.length
    };
  } catch (err) {
    console.error("[storage/upload] Upload failed:", (err == null ? void 0 : err.message) || err);
    throw createError({
      statusCode: 500,
      statusMessage: `Upload failed: ${(err == null ? void 0 : err.message) || "Unknown error"}`
    });
  }
});

export { upload_post as default };
//# sourceMappingURL=upload.post.mjs.map

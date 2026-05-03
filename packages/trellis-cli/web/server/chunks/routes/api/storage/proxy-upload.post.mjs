import { d as defineEventHandler, r as readBody, c as createError, u as useInstantAdmin } from '../../../nitro/nitro.mjs';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff"
]);
const proxyUpload_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.url) || typeof body.url !== "string") {
    throw createError({ statusCode: 400, statusMessage: 'Missing "url" field' });
  }
  if (!(body == null ? void 0 : body.path) || typeof body.path !== "string") {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' });
  }
  const { url, path: storagePath } = body;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: "URL must use http or https" });
  }
  if (storagePath.includes("..") || storagePath.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage path" });
  }
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Trellis/1.0 (image-proxy)" },
      signal: AbortSignal.timeout(15e3)
    });
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `External fetch failed: ${response.status} ${response.statusText}`
      });
    }
    const contentType = ((_b = (_a = response.headers.get("content-type")) == null ? void 0 : _a.split(";")[0]) == null ? void 0 : _b.trim()) || "application/octet-stream";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw createError({
        statusCode: 415,
        statusMessage: `Unsupported content type: ${contentType}`
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: `Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      });
    }
    const fileBytes = new Uint8Array(arrayBuffer);
    const filename = parsed.pathname.split("/").pop() || "image";
    const db = useInstantAdmin();
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
    if (err.statusCode) throw err;
    console.error("[storage/proxy-upload] Failed:", (err == null ? void 0 : err.message) || err);
    throw createError({
      statusCode: 502,
      statusMessage: `Proxy upload failed: ${(err == null ? void 0 : err.message) || "Unknown error"}`
    });
  }
});

export { proxyUpload_post as default };
//# sourceMappingURL=proxy-upload.post.mjs.map

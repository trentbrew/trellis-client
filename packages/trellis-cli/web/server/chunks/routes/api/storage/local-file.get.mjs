import { d as defineEventHandler, h as getQuery, c as createError, af as setResponseHeader } from '../../../nitro/nitro.mjs';
import { stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import 'zod';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:crypto';
import 'better-sqlite3';
import 'crypto';
import '@google/generative-ai';
import 'node:vm';
import '@instantdb/admin';
import 'node:url';
import '@iconify/utils';
import 'consola';

const NODEBOOK_FILES_DIR = join(homedir(), ".nodebook", "files");
function mimeFromExt(ext) {
  var _a;
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".html": "text/html",
    ".css": "text/css",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".zip": "application/zip"
  };
  return (_a = map[ext.toLowerCase()]) != null ? _a : "application/octet-stream";
}
const localFile_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawPath = query.path;
  if (!rawPath || typeof rawPath !== "string") {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" query param' });
  }
  const decoded = decodeURIComponent(rawPath);
  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  const absolutePath = join(NODEBOOK_FILES_DIR, decoded);
  try {
    await stat(absolutePath);
  } catch {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }
  try {
    const data = await readFile(absolutePath);
    const mime = mimeFromExt(extname(absolutePath));
    setResponseHeader(event, "Content-Type", mime);
    setResponseHeader(event, "Content-Length", String(data.length));
    setResponseHeader(event, "Cache-Control", "public, max-age=3600");
    return data;
  } catch (err) {
    console.error("[local-file] Failed to read file:", (err == null ? void 0 : err.message) || err);
    throw createError({ statusCode: 500, statusMessage: "Failed to read file" });
  }
});

export { localFile_get as default };
//# sourceMappingURL=local-file.get.mjs.map

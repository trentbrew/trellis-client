import { d as defineEventHandler, ag as readMultipartFormData, c as createError } from '../../../nitro/nitro.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
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

const NODEBOOK_DIR = join(homedir(), ".nodebook");
const NODEBOOK_FILES_DIR = join(NODEBOOK_DIR, "files");
const localUpload_post = defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No file provided" });
  }
  const filePart = formData.find((p) => p.name === "file");
  const pathPart = formData.find((p) => p.name === "path");
  if (!(filePart == null ? void 0 : filePart.data)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "file" field' });
  }
  if (!(pathPart == null ? void 0 : pathPart.data)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' });
  }
  const relativePath = pathPart.data.toString("utf-8");
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  const absolutePath = join(NODEBOOK_FILES_DIR, relativePath);
  const dir = dirname(absolutePath);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(absolutePath, filePart.data);
    const contentType = filePart.type || "application/octet-stream";
    const filename = filePart.filename || relativePath.split("/").pop() || "file";
    const encodedPath = encodeURIComponent(relativePath);
    return {
      url: `/api/storage/local-file?path=${encodedPath}`,
      localPath: absolutePath,
      filename,
      contentType,
      size: filePart.data.length
    };
  } catch (err) {
    console.error("[local-upload] Failed to write file:", (err == null ? void 0 : err.message) || err);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save file: ${(err == null ? void 0 : err.message) || "Unknown error"}`
    });
  }
});

export { NODEBOOK_DIR, NODEBOOK_FILES_DIR, localUpload_post as default };
//# sourceMappingURL=local-upload.post.mjs.map

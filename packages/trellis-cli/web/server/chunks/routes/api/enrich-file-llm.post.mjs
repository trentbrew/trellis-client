import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
import 'node:vm';
import '@instantdb/admin';
import 'node:url';
import '@iconify/utils';
import 'consola';

const CATEGORY_FIELDS = {
  image: ["description", "altText"],
  video: ["description"],
  audio: ["description", "artist", "album", "genre"],
  document: ["description", "documentAuthor"],
  spreadsheet: ["description"],
  presentation: ["description"],
  code: ["description", "codeLanguage"],
  archive: ["description"],
  font: ["description"],
  model: ["description"],
  data: ["description"],
  other: ["description"]
};
const SYSTEM_PROMPT = `You are a file metadata assistant. Given a filename and category, generate concise, factual metadata for that file. Return ONLY valid JSON \u2014 no markdown, no code fences. Use empty string for unknown fields. Never fabricate, guess, or hallucinate.`;
function buildPrompt(body) {
  const fields = CATEGORY_FIELDS[body.fileCategory] || ["description"];
  const schemaStr = fields.map((f) => `"${f}":""`).join(", ");
  const ctx = [];
  ctx.push(`Filename: "${body.filename}"`);
  ctx.push(`Category: ${body.fileCategory}`);
  if (body.fileExtension) ctx.push(`Extension: .${body.fileExtension}`);
  if (body.mimeType) ctx.push(`MIME type: ${body.mimeType}`);
  if (body.sizeBytes) ctx.push(`Size: ${(body.sizeBytes / 1024).toFixed(1)} KB`);
  if (body.contentPreview) {
    ctx.push(`
Content preview (first ~2000 chars):
"""
${body.contentPreview.slice(0, 2e3)}
"""`);
  }
  return `${ctx.join("\n")}

Generate metadata. Return ONLY this JSON (fill in all known fields):
{${schemaStr}, "name":"<cleaned display name without extension>", "aiTags":["tag1","tag2","tag3"]}

Rules:
- name: clean display name inferred from filename (no extension, no underscores/dashes unless meaningful)
- description: 1\u20133 factual sentences. For code files, describe what the code does. For data files, describe what the data represents.
- aiTags: 3\u20136 lowercase topical tags relevant to the file's content/purpose.
- If you cannot determine a field from the filename alone, return an empty string.
- Never fabricate content you cannot reasonably infer.`;
}
function parseResponse(raw, allowedFields) {
  var _a;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const obj = (_a = raw.match(/\{[\s\S]*\}/)) == null ? void 0 : _a[0];
    if (!obj) return {};
    try {
      parsed = JSON.parse(obj);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") return {};
  const result = {};
  for (const key of [...allowedFields, "name", "aiTags"]) {
    const val = parsed[key];
    if (key === "aiTags") {
      if (Array.isArray(val) && val.length) {
        result.aiTags = val.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().toLowerCase());
      }
    } else if (typeof val === "string" && val.trim().length > 0) {
      result[key] = val.trim();
    }
  }
  return result;
}
const enrichFileLlm_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.filename)) {
    throw createError({ statusCode: 400, message: '"filename" is required' });
  }
  const category = body.fileCategory || "other";
  const allowedFields = CATEGORY_FIELDS[category] || ["description"];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw createError({ statusCode: 500, message: "GEMINI_API_KEY not configured" });
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT
    });
    const prompt = buildPrompt({
      filename: body.filename.trim().slice(0, 200),
      fileCategory: category,
      fileExtension: body.fileExtension,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentPreview: body.contentPreview
    });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    return parseResponse(raw, allowedFields);
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `File enrichment failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { enrichFileLlm_post as default };
//# sourceMappingURL=enrich-file-llm.post.mjs.map

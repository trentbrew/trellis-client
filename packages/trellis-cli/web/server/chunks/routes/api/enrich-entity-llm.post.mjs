import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
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

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || "gemma4:e4b";
const VALID_TYPES = /* @__PURE__ */ new Set([
  "person",
  "organization",
  "project",
  "task",
  "event",
  "appointment",
  "trip",
  "deadline",
  "payment"
]);
const FIELD_SCHEMA = {
  organization: ["description", "website", "industry", "headquarters", "founded"],
  person: ["description", "role", "company", "email", "website"],
  project: ["description"],
  task: ["description"],
  event: ["description", "location"],
  appointment: ["description", "location"],
  trip: ["description", "location"],
  deadline: ["description"],
  payment: ["description", "vendor"]
};
const SYSTEM_PROMPT = `You are a knowledge-graph enrichment assistant. Given an entity's name and type, return publicly-known factual profile information. Return ONLY valid JSON (no markdown, no code fences, no commentary). If you do not know a specific entity with high confidence, return empty strings or omit the fields entirely \u2014 do NOT guess or fabricate.`;
function buildUserPrompt(name, type, context) {
  const fields = FIELD_SCHEMA[type] || ["description"];
  const fieldJson = fields.map((f) => `"${f}":"..."`).join(",");
  const ctx = context ? `

Extra context from where this entity was mentioned:
"""${context}"""` : "";
  return `Entity name: "${name}"
Entity type: ${type}${ctx}

Return a JSON object with ONLY these keys (empty string if unknown):
{${fieldJson},"tags":["relevant","topic","keywords"]}

Rules:
- description: 1\u20132 concise sentences, factual only.
- website: full URL with protocol (e.g. "https://example.com") or empty.
- tags: 3-6 short lowercase topical tags, no duplicates.
- If you genuinely don't recognise this entity, return {"${fields[0]}":"","tags":[]}.
- No hallucination. No marketing language. Facts only.`;
}
function parseResponse(raw, allowedFields) {
  var _a;
  const empty = { fields: {}, tags: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const code = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const obj = code ? code[1] : (_a = raw.match(/\{[\s\S]*\}/)) == null ? void 0 : _a[0];
    if (!obj) return empty;
    try {
      parsed = JSON.parse(obj.trim());
    } catch {
      return empty;
    }
  }
  if (!parsed || typeof parsed !== "object") return empty;
  const fields = {};
  for (const key of allowedFields) {
    const val = parsed[key];
    if (typeof val === "string" && val.trim().length > 0) {
      fields[key] = val.trim();
    }
  }
  const tags = [];
  if (Array.isArray(parsed.tags)) {
    for (const t of parsed.tags) {
      if (typeof t === "string" && t.trim()) tags.push(t.trim().toLowerCase());
    }
  }
  return { fields, tags: [...new Set(tags)] };
}
const enrichEntityLlm_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.name) || typeof body.name !== "string") {
    throw createError({ statusCode: 400, message: '"name" is required' });
  }
  if (!body.type || !VALID_TYPES.has(body.type)) {
    throw createError({ statusCode: 400, message: '"type" must be a valid entity type' });
  }
  const allowedFields = FIELD_SCHEMA[body.type];
  const name = body.name.trim().slice(0, 200);
  const context = (_a = body.context) == null ? void 0 : _a.trim().slice(0, 600);
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(name, body.type, context),
        stream: false
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    return parseResponse((_b = data.response) != null ? _b : "", allowedFields);
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `Entity enrichment failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { enrichEntityLlm_post as default };
//# sourceMappingURL=enrich-entity-llm.post.mjs.map

import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
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
const DEFAULT_EMBED_MODEL = process.env.TRELLIS_EMBED_MODEL || "nomic-embed-text";
async function callOllamaEmbed(params) {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: params.model, input: params.input })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama /api/embed returned ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  if (Array.isArray(data.embeddings) && data.embeddings.length > 0) {
    return data.embeddings;
  }
  if (Array.isArray(data.embedding) && data.embedding.length > 0) {
    return [data.embedding];
  }
  throw new Error("Ollama returned no embeddings");
}
const embed_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.input)) {
    throw createError({ statusCode: 400, message: '"input" is required' });
  }
  const inputs = Array.isArray(body.input) ? body.input : [body.input];
  const cleaned = inputs.map((s) => typeof s === "string" ? s.trim() : "").filter((s) => s.length > 0);
  if (cleaned.length === 0) {
    throw createError({ statusCode: 400, message: '"input" must contain at least one non-empty string' });
  }
  const model = body.model || DEFAULT_EMBED_MODEL;
  try {
    const embeddings = await callOllamaEmbed({ model, input: cleaned });
    return {
      model,
      provider: "ollama",
      dimensions: (_b = (_a = embeddings[0]) == null ? void 0 : _a.length) != null ? _b : 0,
      embeddings
    };
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `Embed call failed (ollama:${model}): ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { embed_post as default };
//# sourceMappingURL=embed.post.mjs.map

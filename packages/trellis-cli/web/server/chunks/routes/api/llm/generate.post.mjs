import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
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

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || "gemma4:e4b";
function isGeminiModel(model) {
  return /^gemini-/i.test(model);
}
async function callOllama(params) {
  var _a;
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      system: params.system,
      stream: false
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama returned ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  return (_a = data.response) != null ? _a : "";
}
async function callGemini(params) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...params.system ? { systemInstruction: params.system } : {}
  });
  const result = await model.generateContent(params.prompt);
  return result.response.text();
}
const generate_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.prompt) || typeof body.prompt !== "string") {
    throw createError({ statusCode: 400, message: '"prompt" is required' });
  }
  const model = body.model || DEFAULT_MODEL;
  if (model === "passthrough") {
    return { text: body.prompt, model, provider: "passthrough" };
  }
  const provider = isGeminiModel(model) ? "gemini" : "ollama";
  try {
    const text = provider === "gemini" ? await callGemini({ model, system: body.system, prompt: body.prompt }) : await callOllama({ model, system: body.system, prompt: body.prompt });
    return { text, model, provider };
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `LLM call failed (${provider}:${model}): ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { generate_post as default };
//# sourceMappingURL=generate.post.mjs.map

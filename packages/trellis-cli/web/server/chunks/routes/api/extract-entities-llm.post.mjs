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
const MAX_TEXT_LENGTH = 4e3;
const SYSTEM_PROMPT = `You are an entity extraction assistant for a personal knowledge graph. Extract structured entities from the provided text and, when clearly warranted, propose new entity types (ontology schemas) that the user's graph doesn't yet have. Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.`;
const TYPE_LIST = "person, organization, project, task, event, appointment, trip, deadline, payment";
const COLOR_PALETTE = [
  "slate",
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose"
];
function sourceLabel(kind) {
  switch (kind) {
    case "email":
      return "email";
    case "event":
      return "calendar event";
    case "video":
      return "video transcript";
    default:
      return "text";
  }
}
function kindHint(kind) {
  switch (kind) {
    case "email":
      return "Focus on people, organizations, projects, tasks (action items with deadlines), trips (travel plans), payments/invoices, and scheduled events mentioned in the message.";
    case "event":
      return "Focus on people attending or mentioned, organizations involved, related projects, preparation tasks, and any related trips, payments, or sub-appointments implied by the description.";
    case "video":
      return 'Focus on people mentioned or speaking (hosts, guests, authors), organizations/companies referenced, products or projects named, key concepts or topics, and any events or deadlines discussed. Prefer proper nouns that appear clearly in the transcript. Ignore filler words, "uh"/"um", and generic descriptors.';
    default:
      return "Extract any distinct named entities that would be useful to link in a personal knowledge graph.";
  }
}
function buildUserPrompt(text, kind, existingTypes, existingTypeLabels) {
  const source = sourceLabel(kind);
  const existingTypesSection = existingTypes.length > 0 ? `
The user's graph ALREADY contains these entity types \u2014 do NOT propose duplicates of any of them (check both the slug and the label):
  slugs: ${existingTypes.join(", ")}
  labels: ${existingTypeLabels.join(", ")}
` : "";
  return `Extract entities from this ${source}. For each entity provide:
- name: the entity's proper name (not generic descriptions)
- type: one of [${TYPE_LIST}]
- confidence: high, medium, or low
- context: brief phrase explaining why this was extracted

${kindHint(kind)}

Also extract relevant tags (topics, themes, keywords \u2014 lowercase, no duplicates).

\u2500\u2500\u2500 NEW TYPE PROPOSALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
IF the content surfaces a distinct cluster of named things that do NOT fit any of the existing types listed above AND do NOT fit any built-in type [${TYPE_LIST}], you MAY propose up to 3 new entity types. Only propose a new type when you can also give 2+ concrete example instances from this content. Skip this section entirely if nothing fits.
${existingTypesSection}
For each proposed new type, return:
- slug:         lowercase hyphenated identifier, e.g. "technology"
- label:        singular display name, e.g. "Technology"
- labelPlural:  plural display name, e.g. "Technologies"
- entityClass:  one of ["temporal", "document", "actor", "container"]
    \u2022 temporal  \u2014 has dates/times, lives on a calendar (events, deadlines)
    \u2022 document  \u2014 has rich content body (notes, pages, articles)
    \u2022 actor     \u2014 represents a person or agent (people, organizations)
    \u2022 container \u2014 groups or organizes other entities (projects, categories, concepts)
- icon:         REQUIRED \u2014 an Iconify name that semantically matches the type,
                e.g. "lucide:cpu" for Technology, "lucide:lightbulb" for Concept,
                "lucide:languages" for Language. Always include the "lucide:" prefix.
- color:        REQUIRED \u2014 a single Tailwind palette key from: [${COLOR_PALETTE.join(", ")}].
                Pick one whose hue matches the type (cool tones for technical
                concepts, warm tones for ideas/emotional things, etc.).
- description:  one short sentence describing what this type represents.
- confidence:   high, medium, or low.
- fields:       array of 3\u20137 property definitions. MUST include a field with
                name "title" and valueType "title". Each field has:
                  \u2022 name       \u2014 lowerCamelCase identifier
                  \u2022 valueType  \u2014 one of: title, rich_text, number, select,
                                 multi_select, status, date, checkbox, url,
                                 email, phone_number, people, files, relation
                  \u2022 required?  \u2014 true/false
                  \u2022 description? \u2014 short hint for the user
                  \u2022 selectOptions? \u2014 array of strings, for select/multi_select/status only
- exampleInstances: 1\u20135 concrete instances extracted from the content. Each has:
                  \u2022 title       \u2014 the instance name
                  \u2022 context?    \u2014 one-line rationale
                  \u2022 properties? \u2014 optional object keyed by field name, with
                                  per-field values (strings, numbers, booleans)

Return JSON in this exact format:
{"entities":[{"name":"...","type":"...","confidence":"...","context":"..."}],"tags":["tag1","tag2"],"typeProposals":[{"slug":"...","label":"...","labelPlural":"...","entityClass":"...","icon":"lucide:...","color":"...","description":"...","confidence":"...","fields":[{"name":"title","valueType":"title","required":true}],"exampleInstances":[{"title":"...","context":"..."}]}]}

If you have no new types to propose, return "typeProposals": [].

${source.charAt(0).toUpperCase() + source.slice(1)} content:
---
${text}
---`;
}
function stripHtml(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
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
const VALID_CONFIDENCES = /* @__PURE__ */ new Set(["high", "medium", "low"]);
const VALID_ENTITY_CLASSES = /* @__PURE__ */ new Set(["temporal", "document", "actor", "container"]);
const VALID_VALUE_TYPES = /* @__PURE__ */ new Set([
  "title",
  "rich_text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "checkbox",
  "url",
  "email",
  "phone_number",
  "people",
  "files",
  "relation"
]);
const CLASS_ICONS = {
  temporal: "lucide:calendar",
  document: "lucide:file-text",
  actor: "lucide:user",
  container: "lucide:folder"
};
const CLASS_COLORS = {
  temporal: "blue",
  document: "emerald",
  actor: "sky",
  container: "violet"
};
const SLUG_RE = /^[a-z][a-z0-9_-]{1,40}$/;
function normaliseName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
function normaliseIcon(raw, entityClass) {
  if (typeof raw !== "string") return CLASS_ICONS[entityClass];
  const trimmed = raw.trim();
  if (!trimmed) return CLASS_ICONS[entityClass];
  if (trimmed.includes(":")) return trimmed;
  return `lucide:${trimmed}`;
}
function normaliseColor(raw, entityClass) {
  if (typeof raw !== "string") return CLASS_COLORS[entityClass];
  const trimmed = raw.trim().toLowerCase();
  if (!/^[a-z]+$/.test(trimmed)) return CLASS_COLORS[entityClass];
  return trimmed;
}
function parseProposedField(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const valueType = typeof raw.valueType === "string" ? raw.valueType.trim() : "";
  if (!name) return null;
  if (!VALID_VALUE_TYPES.has(valueType)) return null;
  const field = { name, valueType };
  if (raw.required === true) field.required = true;
  if (typeof raw.description === "string" && raw.description.trim()) {
    field.description = raw.description.trim();
  }
  if (Array.isArray(raw.selectOptions)) {
    const opts = raw.selectOptions.filter((o) => typeof o === "string" && o.trim());
    if (opts.length > 0) field.selectOptions = opts.map((o) => o.trim());
  }
  return field;
}
function parseProposedInstance(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  const inst = { title };
  if (typeof raw.context === "string" && raw.context.trim()) inst.context = raw.context.trim();
  if (raw.properties && typeof raw.properties === "object") {
    const props = {};
    for (const [k, v] of Object.entries(raw.properties)) {
      if (typeof k !== "string" || !k) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        props[k] = v;
      }
    }
    if (Object.keys(props).length > 0) inst.properties = props;
  }
  return inst;
}
function parseResponse(raw, existingTypes, existingTypeLabels) {
  const empty = { entities: [], tags: [], typeProposals: [] };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } catch {
        return empty;
      }
    } else {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return empty;
        }
      } else {
        return empty;
      }
    }
  }
  if (!parsed || typeof parsed !== "object") return empty;
  const entities = [];
  if (Array.isArray(parsed.entities)) {
    for (const e of parsed.entities) {
      if (typeof (e == null ? void 0 : e.name) === "string" && e.name.trim() && VALID_TYPES.has(e.type) && VALID_CONFIDENCES.has(e.confidence)) {
        entities.push({
          name: e.name.trim(),
          type: e.type,
          confidence: e.confidence,
          context: typeof e.context === "string" ? e.context : ""
        });
      }
    }
  }
  const tags = [];
  if (Array.isArray(parsed.tags)) {
    for (const t of parsed.tags) {
      if (typeof t === "string" && t.trim()) {
        tags.push(t.trim().toLowerCase());
      }
    }
  }
  const typeProposals = parseTypeProposals(parsed.typeProposals, existingTypes, existingTypeLabels);
  return { entities, tags: [...new Set(tags)], typeProposals };
}
function parseTypeProposals(rawProposals, existingTypes, existingTypeLabels) {
  if (!Array.isArray(rawProposals) || rawProposals.length === 0) return [];
  const existingSlugs = new Set(existingTypes.map((s) => normaliseName(s)));
  const existingLabels = new Set(existingTypeLabels.map((s) => normaliseName(s)));
  const existingLabelsForFuzzy = existingTypeLabels.map((s) => normaliseName(s));
  const seenSlugs = /* @__PURE__ */ new Set();
  const out = [];
  for (const raw of rawProposals) {
    if (out.length >= 3) break;
    if (!raw || typeof raw !== "object") continue;
    const p = raw;
    const confidence = p.confidence;
    if (!VALID_CONFIDENCES.has(confidence)) continue;
    if (confidence === "low") continue;
    const slug = typeof p.slug === "string" ? p.slug.trim().toLowerCase() : "";
    const label = typeof p.label === "string" ? p.label.trim() : "";
    if (!SLUG_RE.test(slug)) continue;
    if (!label) continue;
    const entityClass = VALID_ENTITY_CLASSES.has(p.entityClass) ? p.entityClass : "container";
    const normSlug = normaliseName(slug);
    const normLabel = normaliseName(label);
    if (existingSlugs.has(normSlug) || existingLabels.has(normLabel)) continue;
    if (seenSlugs.has(normSlug)) continue;
    let tooSimilar = false;
    for (const existing of existingLabelsForFuzzy) {
      if (!existing) continue;
      if (Math.abs(existing.length - normLabel.length) > 3) continue;
      if (levenshtein(existing, normLabel) <= 2) {
        tooSimilar = true;
        break;
      }
    }
    if (tooSimilar) continue;
    for (const existing of existingSlugs) {
      if (existing && (existing.includes(normSlug) || normSlug.includes(existing)) && existing.length >= 4) {
        tooSimilar = true;
        break;
      }
    }
    if (tooSimilar) continue;
    let fields = [];
    if (Array.isArray(p.fields)) {
      for (const f of p.fields) {
        const parsed = parseProposedField(f);
        if (parsed) fields.push(parsed);
      }
    }
    const hasTitle = fields.some((f) => f.valueType === "title");
    if (!hasTitle) {
      fields = [{ name: "title", valueType: "title", required: true }, ...fields];
    }
    if (fields.length > 8) fields = fields.slice(0, 8);
    const exampleInstances = [];
    if (Array.isArray(p.exampleInstances)) {
      for (const inst of p.exampleInstances) {
        const parsed = parseProposedInstance(inst);
        if (parsed) exampleInstances.push(parsed);
        if (exampleInstances.length >= 5) break;
      }
    }
    if (exampleInstances.length === 0) continue;
    const iconMissing = typeof p.icon !== "string" || !p.icon.trim();
    const colorMissing = typeof p.color !== "string" || !p.color.trim();
    if (iconMissing || colorMissing) {
      console.warn("[extract-entities-llm] proposal missing icon|color, using class default", {
        slug,
        iconMissing,
        colorMissing
      });
    }
    const icon = normaliseIcon(p.icon, entityClass);
    const color = normaliseColor(p.color, entityClass);
    const labelPlural = typeof p.labelPlural === "string" && p.labelPlural.trim() ? p.labelPlural.trim() : label.endsWith("s") ? label : `${label}s`;
    out.push({
      slug,
      label,
      labelPlural,
      entityClass,
      icon,
      color,
      description: typeof p.description === "string" ? p.description.trim() : "",
      confidence,
      fields,
      exampleInstances
    });
    seenSlugs.add(normSlug);
  }
  return out;
}
const extractEntitiesLlm_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.text) || typeof body.text !== "string") {
    throw createError({ statusCode: 400, message: '"text" is required' });
  }
  const kind = body.kind === "email" || body.kind === "event" || body.kind === "video" ? body.kind : "generic";
  const existingTypes = Array.isArray(body.existingTypes) ? body.existingTypes.filter((s) => typeof s === "string" && s.trim().length > 0) : [];
  const existingTypeLabels = Array.isArray(body.existingTypeLabels) ? body.existingTypeLabels.filter((s) => typeof s === "string" && s.trim().length > 0) : [];
  let text = body.text;
  if (text.includes("<") && text.includes(">")) {
    text = stripHtml(text);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + "\n[...truncated]";
  }
  if (text.trim().length < 20) {
    return { entities: [], tags: [], typeProposals: [] };
  }
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(text, kind, existingTypes, existingTypeLabels),
        stream: false
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    return parseResponse((_a = data.response) != null ? _a : "", existingTypes, existingTypeLabels);
  } catch (err) {
    throw createError({
      statusCode: 502,
      message: `Entity extraction failed: ${(err == null ? void 0 : err.message) || String(err)}`
    });
  }
});

export { extractEntitiesLlm_post as default };
//# sourceMappingURL=extract-entities-llm.post.mjs.map

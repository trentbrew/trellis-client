import { d as defineEventHandler, h as getQuery, c as createError } from '../../nitro/nitro.mjs';
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

const extractEntities_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const targetUrl = query.url;
  if (!targetUrl) {
    throw createError({ statusCode: 400, statusMessage: "Missing ?url parameter" });
  }
  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid URL" });
  }
  const entities = [];
  const tags = [];
  const host = parsed.hostname.replace(/^www\./, "");
  const oembedEntities = await extractFromOEmbed(targetUrl, host);
  entities.push(...oembedEntities);
  const html = await fetchHTML(targetUrl);
  if (html) {
    entities.push(...extractFromJsonLd(html));
    entities.push(...extractFromMetaTags(html));
    entities.push(...extractFromBylines(html));
    tags.push(...extractTags(html));
  }
  const deduped = deduplicateEntities(entities);
  return { entities: deduped, tags: [...new Set(tags)] };
});
async function fetchHTML(targetUrl) {
  var _a;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrellisBot/1.0; +https://trellis.app)",
        Accept: "text/html,application/xhtml+xml,*/*"
      },
      redirect: "follow"
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const reader = (_a = res.body) == null ? void 0 : _a.getReader();
    const decoder = new TextDecoder();
    let html = "";
    const MAX_BYTES = 1e5;
    if (reader) {
      let bytesRead = 0;
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.byteLength;
      }
      reader.cancel().catch(() => {
      });
    } else {
      html = await res.text();
    }
    return html;
  } catch {
    return "";
  }
}
function extractFromJsonLd(html) {
  const results = [];
  const re = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      processJsonLdNode(data, results);
    } catch {
    }
  }
  return results;
}
function processJsonLdNode(node, results) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node["@graph"])) {
    for (const item of node["@graph"]) {
      processJsonLdNode(item, results);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) processJsonLdNode(item, results);
    return;
  }
  const type = node["@type"];
  if (type === "Person" || type === "Organization") {
    const name = node.name || node.givenName;
    if (name && typeof name === "string") {
      results.push({
        name: name.trim(),
        type: type === "Person" ? "person" : "organization",
        confidence: "high",
        source: "json-ld",
        meta: {
          url: node.url || node.sameAs || void 0,
          role: node.jobTitle || void 0,
          description: node.description || void 0
        }
      });
    }
  }
  for (const field of ["author", "publisher", "creator", "contributor"]) {
    if (node[field]) {
      const authors = Array.isArray(node[field]) ? node[field] : [node[field]];
      for (const author of authors) {
        if (typeof author === "string") {
          results.push({
            name: author.trim(),
            type: "person",
            confidence: "high",
            source: "json-ld"
          });
        } else if (author && typeof author === "object") {
          const authorType = author["@type"];
          const name = author.name || author.givenName;
          if (name && typeof name === "string") {
            results.push({
              name: name.trim(),
              type: authorType === "Organization" ? "organization" : "person",
              confidence: "high",
              source: "json-ld",
              meta: {
                url: author.url || author.sameAs || void 0,
                role: author.jobTitle || void 0,
                description: author.description || void 0
              }
            });
          }
        }
      }
    }
  }
  for (const field of ["mentions", "about"]) {
    if (node[field]) {
      const items = Array.isArray(node[field]) ? node[field] : [node[field]];
      for (const item of items) {
        if (item && typeof item === "object") {
          const itemType = item["@type"];
          if (itemType === "Person" || itemType === "Organization") {
            const name = item.name || item.givenName;
            if (name && typeof name === "string") {
              results.push({
                name: name.trim(),
                type: itemType === "Person" ? "person" : "organization",
                confidence: "medium",
                source: "json-ld",
                meta: {
                  url: item.url || item.sameAs || void 0,
                  description: item.description || void 0
                }
              });
            }
          }
        }
      }
    }
  }
}
function extractFromMetaTags(html) {
  const results = [];
  const authorPatterns = [
    /article:author/i,
    /^author$/i,
    /citation_author/i,
    /dc\.creator/i
  ];
  for (const pattern of authorPatterns) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["']`, "gi");
    let m;
    while ((m = re1.exec(html)) !== null) {
      if (pattern.test(m[1])) {
        const name = decodeHTMLEntities(m[2]).trim();
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: "person", confidence: "medium", source: "meta-tag" });
        }
      }
    }
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']([^"']+)["']`, "gi");
    while ((m = re2.exec(html)) !== null) {
      if (pattern.test(m[2])) {
        const name = decodeHTMLEntities(m[1]).trim();
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: "person", confidence: "medium", source: "meta-tag" });
        }
      }
    }
  }
  const publisherPatterns = [/article:publisher/i, /og:site_name/i, /publisher/i];
  for (const pattern of publisherPatterns) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["']`, "gi");
    let m;
    while ((m = re1.exec(html)) !== null) {
      if (pattern.test(m[1])) {
        const name = decodeHTMLEntities(m[2]).trim();
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: "organization", confidence: "medium", source: "meta-tag" });
        }
      }
    }
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']([^"']+)["']`, "gi");
    while ((m = re2.exec(html)) !== null) {
      if (pattern.test(m[2])) {
        const name = decodeHTMLEntities(m[1]).trim();
        if (name && !looksLikeUrl(name)) {
          results.push({ name, type: "organization", confidence: "medium", source: "meta-tag" });
        }
      }
    }
  }
  return results;
}
function extractFromBylines(html) {
  const results = [];
  const authorClassRe = /<[a-z][a-z0-9]*[^>]+class=["'][^"']*\bauthor\b[^"']*["'][^>]*>([^<]{2,80})</ig;
  let m;
  while ((m = authorClassRe.exec(html)) !== null) {
    const name = stripTags(decodeHTMLEntities(m[1])).trim();
    if (name && name.length > 1 && name.length < 80 && !looksLikeUrl(name) && !looksLikeMarkup(name)) {
      results.push({ name, type: "person", confidence: "low", source: "byline" });
    }
  }
  const relAuthorRe = /<a[^>]+rel=["']author["'][^>]*>([^<]{2,80})<\/a>/gi;
  while ((m = relAuthorRe.exec(html)) !== null) {
    const name = stripTags(decodeHTMLEntities(m[1])).trim();
    if (name && name.length > 1 && !looksLikeUrl(name) && !looksLikeMarkup(name)) {
      results.push({ name, type: "person", confidence: "low", source: "byline" });
    }
  }
  return results;
}
function extractTags(html) {
  const tags = [];
  const tagRe1 = /<meta[^>]+(?:property|name)=["']article:tag["'][^>]+content=["']([^"']+)["']/gi;
  const tagRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']article:tag["']/gi;
  let m;
  while ((m = tagRe1.exec(html)) !== null) tags.push(decodeHTMLEntities(m[1]).trim());
  while ((m = tagRe2.exec(html)) !== null) tags.push(decodeHTMLEntities(m[1]).trim());
  const kwRe1 = /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i;
  const kwRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["']/i;
  const kwMatch = html.match(kwRe1) || html.match(kwRe2);
  if (kwMatch) {
    const keywords = kwMatch[1].split(",").map((k) => k.trim()).filter(Boolean);
    tags.push(...keywords);
  }
  return tags.filter((t) => t.length > 0 && t.length < 60);
}
async function extractFromOEmbed(targetUrl, host) {
  const oembedEndpoints = {
    "youtube.com": `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    "m.youtube.com": `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    "youtu.be": `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
    "vimeo.com": `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`,
    "open.spotify.com": `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`
  };
  const endpoint = oembedEndpoints[host];
  if (!endpoint) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    if (data.author_name) {
      results.push({
        name: data.author_name,
        type: "person",
        confidence: "high",
        source: "oembed",
        meta: { url: data.author_url || void 0 }
      });
    }
    return results;
  } catch {
    return [];
  }
}
function deduplicateEntities(entities) {
  const seen = /* @__PURE__ */ new Map();
  const confidenceRank = { high: 3, medium: 2, low: 1 };
  for (const e of entities) {
    const key = `${e.name.toLowerCase()}::${e.type}`;
    const existing = seen.get(key);
    if (!existing || confidenceRank[e.confidence] > confidenceRank[existing.confidence]) {
      seen.set(key, e);
    }
  }
  return Array.from(seen.values());
}
function looksLikeUrl(s) {
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
}
function looksLikeMarkup(s) {
  return /<[a-z]/i.test(s) || /\{[{%]/.test(s);
}
function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}
function decodeHTMLEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export { extractEntities_get as default };
//# sourceMappingURL=extract-entities.get.mjs.map

import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
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

function extractYoutubeId(input) {
  if (!input) return null;
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const shorts = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embed) return embed[1];
    }
  } catch {
  }
  const anyMatch = raw.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/);
  return anyMatch ? anyMatch[1] : null;
}
async function fetchOEmbed(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { "User-Agent": "Mozilla/5.0 TrellisBot/1.0" } }
    );
    if (!res.ok) return { title: "", author: "", thumbnail: "" };
    const data = await res.json();
    return {
      title: data.title || "",
      author: data.author_name || "",
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch {
    return {
      title: "",
      author: "",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }
}
async function fetchChapters(videoId) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (!match) return [];
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      return [];
    }
    const panels = data == null ? void 0 : data.engagementPanels;
    if (!Array.isArray(panels)) return [];
    for (const panel of panels) {
      const contents = (_c = (_b = (_a = panel == null ? void 0 : panel.engagementPanelSectionListRenderer) == null ? void 0 : _a.content) == null ? void 0 : _b.macroMarkersListRenderer) == null ? void 0 : _c.contents;
      if (!Array.isArray(contents)) continue;
      const chapters = [];
      for (const entry of contents) {
        const r = entry == null ? void 0 : entry.macroMarkersListItemRenderer;
        if (!r) continue;
        const title = ((_d = r == null ? void 0 : r.title) == null ? void 0 : _d.simpleText) || ((_g = (_f = (_e = r == null ? void 0 : r.title) == null ? void 0 : _e.runs) == null ? void 0 : _f[0]) == null ? void 0 : _g.text) || "";
        const ms = Number((_k = (_i = (_h = r == null ? void 0 : r.onTap) == null ? void 0 : _h.watchEndpoint) == null ? void 0 : _i.startTimeMs) != null ? _k : (_j = r == null ? void 0 : r.timeDescription) == null ? void 0 : _j.simpleText);
        const startSec = Number.isFinite(ms) ? ms / 1e3 : parseTimeString((_l = r == null ? void 0 : r.timeDescription) == null ? void 0 : _l.simpleText);
        if (title && Number.isFinite(startSec)) {
          chapters.push({ start: startSec, title });
        }
      }
      if (chapters.length) return chapters;
    }
  } catch {
  }
  return [];
}
function parseTimeString(s) {
  if (!s) return Number.NaN;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return Number.NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.NaN;
}
async function fetchTranscript(videoId, lang) {
  const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang });
  return { cues: normaliseCues(raw), language: lang };
}
function normaliseCues(raw) {
  if (!raw.length) return [];
  const anyBigDuration = raw.some((r) => Number(r.duration) > 100);
  const anyBigOffset = raw.some((r) => Number(r.offset) > 7200);
  const unitMs = anyBigDuration || anyBigOffset;
  const divisor = unitMs ? 1e3 : 1;
  return raw.map((r) => ({
    start: (Number(r.offset) || 0) / divisor,
    duration: (Number(r.duration) || 0) / divisor,
    text: decodeHtmlEntities(
      String(r.text || "").replace(/\s+/g, " ").trim()
    )
  }));
}
function decodeHtmlEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}
const transcript_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = (body == null ? void 0 : body.videoId) || (body == null ? void 0 : body.url);
  if (!input) {
    throw createError({ statusCode: 400, message: '"url" or "videoId" is required' });
  }
  const videoId = extractYoutubeId(input);
  if (!videoId) {
    throw createError({ statusCode: 400, message: "Could not extract a YouTube video id" });
  }
  const lang = (body.lang || "en").toLowerCase();
  let transcript = [];
  let language = lang;
  try {
    const result2 = await fetchTranscript(videoId, lang);
    transcript = result2.cues;
    language = result2.language;
  } catch (err) {
    try {
      const fallback = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = normaliseCues(fallback);
      language = "auto";
    } catch (fallbackErr) {
      throw createError({
        statusCode: 422,
        message: `No transcript available: ${(err == null ? void 0 : err.message) || (fallbackErr == null ? void 0 : fallbackErr.message) || "unknown error"}`
      });
    }
  }
  const [oembed, chapters] = await Promise.all([fetchOEmbed(videoId), fetchChapters(videoId)]);
  const lastCue = transcript[transcript.length - 1];
  const duration = lastCue ? Math.round(lastCue.start + lastCue.duration) : 0;
  const result = {
    videoId,
    title: oembed.title,
    author: oembed.author,
    thumbnail: oembed.thumbnail,
    duration,
    transcript,
    chapters,
    language
  };
  return result;
});

export { transcript_post as default, extractYoutubeId };
//# sourceMappingURL=transcript.post.mjs.map

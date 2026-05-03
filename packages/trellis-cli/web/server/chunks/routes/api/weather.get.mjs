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

const cache = /* @__PURE__ */ new Map();
const CACHE_TTL = 15 * 60 * 1e3;
const weather_get = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
  const query = getQuery(event);
  const lat = parseFloat(query.lat);
  const lon = parseFloat(query.lon);
  if (isNaN(lat) || isNaN(lon)) {
    throw createError({ statusCode: 400, statusMessage: "Missing or invalid ?lat and ?lon parameters" });
  }
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      throw createError({ statusCode: 502, statusMessage: `Open-Meteo returned ${resp.status}` });
    }
    const raw = await resp.json();
    const data = {
      temperature: (_b = (_a = raw.current) == null ? void 0 : _a.temperature_2m) != null ? _b : null,
      feelsLike: (_d = (_c = raw.current) == null ? void 0 : _c.apparent_temperature) != null ? _d : null,
      humidity: (_f = (_e = raw.current) == null ? void 0 : _e.relative_humidity_2m) != null ? _f : null,
      windSpeed: (_h = (_g = raw.current) == null ? void 0 : _g.wind_speed_10m) != null ? _h : null,
      weatherCode: (_j = (_i = raw.current) == null ? void 0 : _i.weather_code) != null ? _j : 0,
      isDay: (_l = (_k = raw.current) == null ? void 0 : _k.is_day) != null ? _l : 1,
      high: (_o = (_n = (_m = raw.daily) == null ? void 0 : _m.temperature_2m_max) == null ? void 0 : _n[0]) != null ? _o : null,
      low: (_r = (_q = (_p = raw.daily) == null ? void 0 : _p.temperature_2m_min) == null ? void 0 : _q[0]) != null ? _r : null,
      unit: "\xB0F"
    };
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
    return data;
  } catch (err) {
    if (err.statusCode) throw err;
    throw createError({ statusCode: 502, statusMessage: `Weather fetch failed: ${err.message}` });
  }
});

export { weather_get as default };
//# sourceMappingURL=weather.get.mjs.map

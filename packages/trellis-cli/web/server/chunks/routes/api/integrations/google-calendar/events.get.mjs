import { d as defineEventHandler, h as getQuery, c as createError, P as requireConnectionOwner, e as useTqlKernel, M as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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

async function getCredentials(kernel, connectionId) {
  var _a;
  const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
  const facts = kernel.getStore().getFactsByEntity(entityId);
  const credentialsRef = (_a = facts.find((f) => f.a === "credentialsRef")) == null ? void 0 : _a.v;
  if (!credentialsRef) return null;
  try {
    return JSON.parse(credentialsRef);
  } catch {
    return null;
  }
}
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const tokenData = await $fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    }
  });
  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1e3
  };
}
const events_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const connectionId = query.connectionId;
  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: "Missing connectionId query parameter." });
  }
  await requireConnectionOwner(event, connectionId);
  const kernel = useTqlKernel();
  let creds = await getCredentials(kernel, connectionId);
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: "No credentials found for this connection." });
  }
  const REFRESH_BUFFER_MS = 5 * 60 * 1e3;
  if (creds.expiresAt < Date.now() + REFRESH_BUFFER_MS) {
    if (!creds.refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: "Token expired and no refresh token available. Please reconnect."
      });
    }
    try {
      const refreshed = await refreshAccessToken(
        creds.refreshToken,
        config.public.googleClientId,
        config.googleClientSecret
      );
      const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
      const updatedCreds = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt
      };
      await kernel.updateNode(
        entityId,
        {
          credentialsRef: JSON.stringify(updatedCreds)
        },
        "entity"
      );
      creds = updatedCreds;
    } catch (err) {
      console.error("[gcal/events] Token refresh failed:", (err == null ? void 0 : err.data) || err);
      throw createError({ statusCode: 401, statusMessage: "Failed to refresh access token. Please reconnect." });
    }
  }
  const accessToken = creds.accessToken;
  if (query.listCalendars === "true") {
    try {
      const calendarList = await $fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return calendarList;
    } catch (err) {
      console.error("[gcal/events] Failed to list calendars:", (err == null ? void 0 : err.data) || err);
      throw createError({ statusCode: 502, statusMessage: "Failed to fetch calendar list from Google." });
    }
  }
  const calendarId = query.calendarId || "primary";
  const timeMin = query.timeMin || new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3).toISOString();
  const timeMax = query.timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString();
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500"
  });
  try {
    const eventsResponse = await $fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return eventsResponse;
  } catch (err) {
    console.error("[gcal/events] Failed to fetch events:", (err == null ? void 0 : err.data) || err);
    throw createError({ statusCode: 502, statusMessage: "Failed to fetch events from Google Calendar." });
  }
});

export { events_get as default };
//# sourceMappingURL=events.get.mjs.map

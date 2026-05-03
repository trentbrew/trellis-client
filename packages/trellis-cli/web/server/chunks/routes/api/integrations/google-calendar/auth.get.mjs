import { d as defineEventHandler, c as createError, K as setCookie, h as getQuery, L as sendRedirect, M as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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

const auth_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const clientId = config.public.googleClientId;
  const redirectUri = config.googleCalendarRedirectUri;
  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: "Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI."
    });
  }
  const state = crypto.randomUUID();
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    maxAge: 300,
    path: "/",
    sameSite: "lax"
  };
  setCookie(event, "gcal_oauth_state", state, cookieOpts);
  const query = getQuery(event);
  const userId = typeof query.userId === "string" ? query.userId : "";
  if (userId) {
    setCookie(event, "gcal_oauth_user", userId, cookieOpts);
  }
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "";
  if (returnTo) {
    setCookie(event, "gcal_oauth_return", returnTo, cookieOpts);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    state
  });
  const emailHint = typeof query.email === "string" ? query.email : "";
  if (emailHint) {
    params.set("login_hint", emailHint);
  }
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return sendRedirect(event, authUrl);
});

export { auth_get as default };
//# sourceMappingURL=auth.get.mjs.map

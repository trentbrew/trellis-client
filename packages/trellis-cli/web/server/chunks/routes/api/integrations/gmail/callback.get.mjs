import { d as defineEventHandler, h as getQuery, N as getCookie, O as deleteCookie, c as createError, L as sendRedirect, e as useTqlKernel, M as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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

const callback_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const state = query.state;
  const savedState = getCookie(event, "gmail_oauth_state");
  const oauthUserId = getCookie(event, "gmail_oauth_user") || "";
  const returnTo = getCookie(event, "gmail_oauth_return") || "";
  deleteCookie(event, "gmail_oauth_state");
  deleteCookie(event, "gmail_oauth_user");
  deleteCookie(event, "gmail_oauth_return");
  const successRedirect = returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=gmail` : "/settings/integrations?connected=gmail";
  const errorRedirect = (reason) => returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${reason}` : `/settings/integrations?error=${reason}`;
  if (!state || state !== savedState) {
    throw createError({ statusCode: 403, statusMessage: "Invalid OAuth state \u2014 possible CSRF attack." });
  }
  if (query.error) {
    console.error("[gmail/callback] OAuth error from Google:", query.error);
    return sendRedirect(event, errorRedirect("oauth_denied"));
  }
  const code = query.code;
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: "Missing authorization code." });
  }
  const clientId = config.public.googleClientId;
  const clientSecret = config.googleClientSecret;
  const redirectUri = config.gmailRedirectUri;
  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: "Gmail integration is not fully configured." });
  }
  let tokenData;
  try {
    tokenData = await $fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }
    });
  } catch (err) {
    console.error("[gmail/callback] Token exchange failed:", (err == null ? void 0 : err.data) || err);
    return sendRedirect(event, errorRedirect("token_exchange_failed"));
  }
  let email = "unknown";
  try {
    const userInfo = await $fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    email = userInfo.email || "unknown";
  } catch {
    console.warn('[gmail/callback] Failed to fetch user email \u2014 continuing with "unknown"');
  }
  const kernel = useTqlKernel();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = Date.now() + tokenData.expires_in * 1e3;
  const credentialsBlob = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || "",
    expiresAt,
    scope: tokenData.scope
  });
  const connId = `entity:integration-conn-gmail-${email.replace(/[^a-z0-9]/gi, "-")}`;
  const userId = oauthUserId || email;
  await kernel.createNode(connId, {
    type: "integration_connection",
    title: `Gmail (${email})`,
    integrationId: "gmail",
    userId,
    connectionStatus: "connected",
    connectedAt: now,
    lastSyncAt: now,
    syncEnabled: true,
    syncIntervalMs: 9e5,
    accountEmail: email,
    accountName: email,
    credentialsRef: credentialsBlob,
    syncedEntityCount: 0
  }, "entity");
  console.log(`[gmail/callback] Connected Gmail for ${email}`);
  return sendRedirect(event, successRedirect);
});

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map

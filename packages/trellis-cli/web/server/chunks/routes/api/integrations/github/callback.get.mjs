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
  const savedState = getCookie(event, "github_oauth_state");
  const oauthUserId = getCookie(event, "github_oauth_user") || "";
  const returnTo = getCookie(event, "github_oauth_return") || "";
  deleteCookie(event, "github_oauth_state");
  deleteCookie(event, "github_oauth_user");
  deleteCookie(event, "github_oauth_return");
  const successRedirect = returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=github` : "/settings/integrations?connected=github";
  const errorRedirect = (reason) => returnTo ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${reason}` : `/settings/integrations?error=${reason}`;
  if (!state || state !== savedState) {
    throw createError({ statusCode: 403, statusMessage: "Invalid OAuth state \u2014 possible CSRF attack." });
  }
  if (query.error) {
    console.error("[github/callback] OAuth error from GitHub:", query.error, query.error_description);
    return sendRedirect(event, errorRedirect("oauth_denied"));
  }
  const code = query.code;
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: "Missing authorization code." });
  }
  const clientId = config.public.githubClientId;
  const clientSecret = config.githubClientSecret;
  const redirectUri = config.githubRedirectUri;
  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: "GitHub integration is not fully configured." });
  }
  let tokenData;
  try {
    tokenData = await $fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      }
    });
  } catch (err) {
    console.error("[github/callback] Token exchange failed:", (err == null ? void 0 : err.data) || err);
    return sendRedirect(event, errorRedirect("token_exchange_failed"));
  }
  if (!(tokenData == null ? void 0 : tokenData.access_token)) {
    console.error("[github/callback] Token response missing access_token:", tokenData);
    return sendRedirect(event, errorRedirect((tokenData == null ? void 0 : tokenData.error) || "no_access_token"));
  }
  let profile = null;
  try {
    profile = await $fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Trellis-Client"
      }
    });
  } catch (err) {
    console.warn("[github/callback] Failed to fetch GitHub user \u2014 continuing without profile", err);
  }
  const login = (profile == null ? void 0 : profile.login) || "unknown";
  const displayName = (profile == null ? void 0 : profile.name) || (profile == null ? void 0 : profile.login) || "GitHub";
  const accountEmail = (profile == null ? void 0 : profile.email) || "";
  const avatarUrl = (profile == null ? void 0 : profile.avatar_url) || "";
  const kernel = useTqlKernel();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = typeof tokenData.expires_in === "number" ? Date.now() + tokenData.expires_in * 1e3 : void 0;
  const refreshTokenExpiresAt = typeof tokenData.refresh_token_expires_in === "number" ? Date.now() + tokenData.refresh_token_expires_in * 1e3 : void 0;
  const credentialsBlob = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || void 0,
    expiresAt,
    refreshTokenExpiresAt,
    scope: tokenData.scope,
    tokenType: tokenData.token_type
  });
  const slug = login.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const connId = `entity:integration-conn-github-${slug}`;
  const userId = oauthUserId || login;
  await kernel.createNode(
    connId,
    {
      type: "integration_connection",
      title: `GitHub (${login})`,
      integrationId: "github",
      userId,
      connectionStatus: "connected",
      connectedAt: now,
      lastSyncAt: now,
      syncEnabled: true,
      syncIntervalMs: 9e5,
      accountEmail,
      accountName: displayName,
      avatar: avatarUrl,
      ownerLogin: login,
      credentialsRef: credentialsBlob,
      syncedEntityCount: 0
    },
    "entity"
  );
  console.log(`[github/callback] Connected GitHub for @${login}`);
  return sendRedirect(event, successRedirect);
});

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map

import { M as useRuntimeConfig, e as useTqlKernel, c as createError } from '../../../../nitro/nitro.mjs';
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

const REFRESH_BUFFER_MS = 5 * 60 * 1e3;
async function loadCredentials(connectionId) {
  var _a;
  const kernel = useTqlKernel();
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
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  const tokenData = await $fetch(
    `https://github.com/login/oauth/access_token?${params.toString()}`,
    {
      method: "POST",
      headers: { Accept: "application/json" }
    }
  );
  if (!(tokenData == null ? void 0 : tokenData.access_token)) {
    throw new Error("GitHub refresh response missing access_token");
  }
  const now = Date.now();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: typeof tokenData.expires_in === "number" ? now + tokenData.expires_in * 1e3 : void 0,
    refreshTokenExpiresAt: typeof tokenData.refresh_token_expires_in === "number" ? now + tokenData.refresh_token_expires_in * 1e3 : void 0,
    scope: tokenData.scope,
    tokenType: tokenData.token_type
  };
}
async function getValidAccessToken(connectionId) {
  var _a, _b;
  const config = useRuntimeConfig();
  const kernel = useTqlKernel();
  let creds = await loadCredentials(connectionId);
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: "No credentials found for this connection." });
  }
  if (!creds.expiresAt) {
    return creds.accessToken;
  }
  if (creds.expiresAt >= Date.now() + REFRESH_BUFFER_MS) {
    return creds.accessToken;
  }
  if (!creds.refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "GitHub access token expired and no refresh token available. Please reconnect."
    });
  }
  try {
    const refreshed = await refreshAccessToken(
      creds.refreshToken,
      config.public.githubClientId,
      config.githubClientSecret
    );
    const entityId = connectionId.startsWith("entity:") ? connectionId : `entity:${connectionId}`;
    const updatedCreds = {
      accessToken: refreshed.accessToken,
      refreshToken: (_a = refreshed.refreshToken) != null ? _a : creds.refreshToken,
      expiresAt: refreshed.expiresAt,
      refreshTokenExpiresAt: (_b = refreshed.refreshTokenExpiresAt) != null ? _b : creds.refreshTokenExpiresAt,
      scope: refreshed.scope || creds.scope,
      tokenType: refreshed.tokenType || creds.tokenType
    };
    await kernel.updateNode(
      entityId,
      { credentialsRef: JSON.stringify(updatedCreds) },
      "entity"
    );
    creds = updatedCreds;
    return creds.accessToken;
  } catch (err) {
    console.error("[github/_credentials] Token refresh failed:", (err == null ? void 0 : err.data) || err);
    throw createError({
      statusCode: 401,
      statusMessage: "Failed to refresh GitHub access token. Please reconnect."
    });
  }
}

export { getValidAccessToken, loadCredentials, refreshAccessToken };
//# sourceMappingURL=_credentials.mjs.map

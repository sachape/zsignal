/**
 * Server-side Meta/Instagram feature flags + secret resolution.
 *
 * Defaults to disabled. Never throws when flags are off — callers should
 * short-circuit with a clear 503 error instead of touching the Graph API.
 */

export interface MetaConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphApiVersion: string;
  businessConfigId?: string;
  appMode?: string;
}

export function isOAuthEnabled(): boolean {
  const v = Deno.env.get("INSTAGRAM_OAUTH_ENABLED");
  return v === "true" || v === "1";
}

export function isPublishEnabled(): boolean {
  const v = Deno.env.get("INSTAGRAM_PUBLISH_ENABLED");
  return v === "true" || v === "1";
}

export function getMetaConfig(): MetaConfig | null {
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const redirectUri = Deno.env.get("META_REDIRECT_URI");
  const graphApiVersion = Deno.env.get("META_GRAPH_API_VERSION") ?? "v21.0";
  if (!appId || !appSecret || !redirectUri) return null;
  return {
    appId,
    appSecret,
    redirectUri,
    graphApiVersion,
    businessConfigId: Deno.env.get("META_BUSINESS_CONFIG_ID") ?? undefined,
    appMode: Deno.env.get("META_APP_MODE") ?? undefined,
  };
}

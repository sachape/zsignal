// Server-side diagnostic for Instagram username retrieval.
// Authenticated, user-scoped, and never returns stored token values.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decryptToken } from "../_shared/tokenCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEBUG_VERSION = "instagram-debug-username-v3";

interface ConnectionRow {
  instagram_account_id: string | null;
  instagram_username: string | null;
  account_type: string | null;
  connection_status: string;
  error_code: string | null;
  error_message: string | null;
  token_expires_at: string | null;
  access_token_encrypted: string | null;
}

interface MetaUsernameResponse {
  id?: string;
  user_id?: string;
  username?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

interface UsernameAttempt {
  success: boolean;
  endpoint: string;
  fields: string;
  method: "GET";
  http_status: number;
  meta_error_message: string | null;
  username: string | null;
}

function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/[\r\n\t]+/g, " ").slice(0, 240);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ debug_version: DEBUG_VERSION, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { success: false, error: "method_not_allowed" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, { success: false, error: "unauthorized" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin
    .from("creator_meta_connections")
    .select(
      "instagram_account_id, instagram_username, account_type, connection_status, error_code, error_message, token_expires_at, access_token_encrypted",
    )
    .eq("user_id", user.id)
    .eq("platform", "instagram")
    .maybeSingle<ConnectionRow>();

  if (error) return json(500, { success: false, error: "connection_read_failed", message: cleanMessage(error.message) });
  if (!data) return json(404, { success: false, error: "instagram_connection_missing" });
  if (!data.access_token_encrypted) return json(409, { success: false, error: "stored_token_missing" });

  const token = await decryptToken(data.access_token_encrypted);
  if (!token) return json(409, { success: false, error: "stored_token_empty" });

  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(token));
  const proof = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const endpoints = [
    { endpoint: "https://graph.instagram.com/me", fields: "user_id,username" },
    { endpoint: "https://graph.instagram.com/me", fields: "id,username" },
    ...(data.instagram_account_id
      ? [{ endpoint: `https://graph.instagram.com/${data.instagram_account_id}`, fields: "username" }]
      : []),
  ];

  const attempts: UsernameAttempt[] = [];
  let foundUsername: string | null = null;
  let foundAccountId: string | null = data.instagram_account_id;

  for (const item of endpoints) {
    const url = new URL(item.endpoint);
    url.searchParams.set("fields", item.fields);
    url.searchParams.set("access_token", token);
    url.searchParams.set("appsecret_proof", proof);

    const response = await fetch(url.toString(), { method: "GET" });
    const payload = (await response.json().catch(() => ({}))) as MetaUsernameResponse;
    const username = typeof payload.username === "string" && payload.username.length > 0 ? payload.username : null;
    const accountId = typeof payload.user_id === "string" ? payload.user_id : typeof payload.id === "string" ? payload.id : null;
    const attempt: UsernameAttempt = {
      success: response.ok && !!username,
      endpoint: item.endpoint,
      fields: item.fields,
      method: "GET",
      http_status: response.status,
      meta_error_message: cleanMessage(payload.error?.message),
      username,
    };
    attempts.push(attempt);

    if (accountId) foundAccountId = accountId;
    if (attempt.success) {
      foundUsername = username;
      break;
    }
  }

  if (foundUsername) {
    const nextErrorCode = data.error_code === "profile_fetch_failed" ? null : data.error_code;
    const nextErrorMessage = data.error_message?.replace(/^Profil Instagram détaillé indisponible \([^)]*\)\. ?\|? ?/, "") || null;
    await admin
      .from("creator_meta_connections")
      .update({
        instagram_account_id: foundAccountId,
        instagram_username: foundUsername,
        account_type: data.account_type === "unknown" ? null : data.account_type,
        error_code: nextErrorCode,
        error_message: nextErrorMessage,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("platform", "instagram");
  }

  return json(200, {
    success: !!foundUsername,
    attempts,
    username: foundUsername,
  });
});
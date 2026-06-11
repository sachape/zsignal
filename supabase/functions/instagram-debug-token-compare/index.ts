// Instagram token comparison diagnostic.
// Accepts a token (with source label) and runs two GET calls against
// graph.instagram.com to compare results across tokens (Streamnco OAuth vs
// Meta-Developer-generated). Never returns the token itself.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";

interface TestResult {
  endpoint: string;
  http_status: number;
  meta_error_type: string | null;
  meta_error_message: string | null;
  user_id: string | null;
  username: string | null;
  long_lived_received: boolean;
  long_lived_expires_in: number | null;
}

async function appSecretProof(token: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(token));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callMe(token: string): Promise<TestResult> {
  const proof = await appSecretProof(token);
  const url = `https://graph.instagram.com/me?fields=user_id,username&access_token=${encodeURIComponent(token)}&appsecret_proof=${proof}`;
  const resp = await fetch(url);
  const data = await resp.json().catch(() => ({}));
  return {
    endpoint: "GET https://graph.instagram.com/me?fields=user_id,username",
    http_status: resp.status,
    meta_error_type: data?.error?.type ?? null,
    meta_error_message: data?.error?.message ?? null,
    user_id: data?.user_id ?? data?.id ?? null,
    username: data?.username ?? null,
    long_lived_received: false,
    long_lived_expires_in: null,
  };
}

async function callExchange(token: string): Promise<TestResult> {
  const proof = await appSecretProof(token);
  const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(META_APP_SECRET)}&access_token=${encodeURIComponent(token)}&appsecret_proof=${proof}`;
  const resp = await fetch(url);
  const data = await resp.json().catch(() => ({}));
  return {
    endpoint: "GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token",
    http_status: resp.status,
    meta_error_type: data?.error?.type ?? null,
    meta_error_message: data?.error?.message ?? null,
    user_id: null,
    username: null,
    long_lived_received: !!data?.access_token,
    long_lived_expires_in: data?.expires_in ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Diagnostic endpoint — gated behind CRON_SECRET so it can't be used as a
  // public Meta-token oracle. Internal Streamnco use only.
  const auth = req.headers.get("Authorization") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token: string = body?.access_token ?? "";
    const source: string = body?.token_source ?? "unknown";

    if (!token || token.length < 20) {
      return new Response(
        JSON.stringify({ error: "Provide { access_token, token_source }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    const token_prefix = token.slice(0, 6);
    const [me, exch] = await Promise.all([callMe(token), callExchange(token)]);

    return new Response(
      JSON.stringify({
        token_source: source,
        token_prefix,
        meta_app_secret_present: !!META_APP_SECRET,
        me_result: me,
        exchange_result: exch,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

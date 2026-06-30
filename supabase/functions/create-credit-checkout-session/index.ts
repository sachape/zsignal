// Pay As You Go — Create a Stripe Checkout Session for a one-shot credit pack.
//
// Auth: user JWT required.
// Body: { package_id: "pack_10" | "pack_30" | "pack_80" }
// Returns: { url } — Checkout Session URL.
//
// Guards:
//   - Package must exist and be `is_active = true` AND have a `stripe_price_id`.
//     This is what keeps the structure dormant until ops flip the switch in
//     `public.credit_packages`.
//   - metadata.type = "credit_pack" so the webhook can dispatch correctly.
//   - Credits are NEVER granted by this endpoint; they are granted exclusively
//     by the webhook on `checkout.session.completed`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://streamnco.com";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!STRIPE_KEY) return json({ error: "stripe_not_configured" }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const packageId = typeof body.package_id === "string" ? body.package_id.trim() : "";
  if (!packageId) return json({ error: "missing_package_id" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: pack, error: pkgErr } = await admin
    .from("credit_packages")
    .select("id, credits, stripe_price_id, is_active, display_name")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgErr || !pack) return json({ error: "package_not_found" }, 404);
  if (!pack.is_active) return json({ error: "package_inactive" }, 409);
  if (!pack.stripe_price_id) return json({ error: "package_price_not_configured" }, 409);

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

  // Re-use an existing Stripe customer when possible so all charges aggregate.
  let customerId: string | undefined;
  const { data: billingRow } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (billingRow?.stripe_customer_id) customerId = billingRow.stripe_customer_id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : user.email ?? undefined,
      line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
      success_url: `${SITE_URL}/billing?credits=success`,
      cancel_url: `${SITE_URL}/billing?credits=cancelled`,
      metadata: {
        type: "credit_pack",
        user_id: user.id,
        package_id: pack.id,
        credits: String(pack.credits),
      },
      payment_intent_data: {
        metadata: {
          type: "credit_pack",
          user_id: user.id,
          package_id: pack.id,
          credits: String(pack.credits),
        },
      },
    });

    console.info(JSON.stringify({
      event: "credit_checkout_created",
      user_id: user.id,
      package_id: pack.id,
      session_id: session.id,
    }));

    return json({ url: session.url });
  } catch (e) {
    console.error("[create-credit-checkout-session] stripe_error", (e as Error).message);
    return json({ error: "stripe_error", detail: (e as Error).message }, 500);
  }
});

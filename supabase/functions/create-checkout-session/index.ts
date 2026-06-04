import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICE_MAP: Record<string, Record<string, string | undefined>> = {
  pro: {
    monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY"),
    annual: Deno.env.get("STRIPE_PRICE_PRO_ANNUAL"),
  },
  growth: {
    monthly: Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY"),
    annual: Deno.env.get("STRIPE_PRICE_GROWTH_ANNUAL"),
  },
};

const SYNTHETIC_PATTERNS: RegExp[] = [
  /^twitch[-_]/i,
  /@users\.streampulse\.app$/i,
  /@users\.stream/i,
  /@twitch\.local$/i,
  /@streamnco-oauth\.local$/i,
  /^no-?email@/i,
  /@example\.(com|org|net)$/i,
];

function isSyntheticBillingEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return true;
  return SYNTHETIC_PATTERNS.some((re) => re.test(e));
}

// Resolves a real signup email for billing. Returns null for synthetic
// Twitch OAuth emails or any placeholder so Stripe Checkout can collect one.
function resolveBillingEmail(user: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): string | null {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;

  const authSource = (user.user_metadata as { auth_source?: string } | undefined)?.auth_source;
  if (authSource === "twitch_oauth") return null;

  if (isSyntheticBillingEmail(email)) return null;

  const provider = (user.app_metadata as { provider?: string } | undefined)?.provider;
  if (provider && !["email", "google"].includes(provider)) return null;

  return email;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL");
    if (!stripeKey || !siteUrl) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const billing_cycle = body?.billing_cycle;

    if (body?.price_id != null || body?.payment_method_types != null) {
      return new Response(JSON.stringify({ error: "Invalid request: client cannot override price or payment methods" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["pro", "growth"].includes(plan) || !["monthly", "annual"].includes(billing_cycle)) {
      return new Response(JSON.stringify({ error: "Invalid plan or billing_cycle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = PRICE_MAP[plan]?.[billing_cycle];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const paymentMethodTypes: string[] = billing_cycle === "annual" ? ["card", "klarna"] : ["card"];

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: existing } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const billingEmail = resolveBillingEmail(user);

    let customerId: string | undefined = existing?.stripe_customer_id;

    if (customerId) {
      // Validate existing Stripe customer's email
      let stripeCustomer: Stripe.Customer | Stripe.DeletedCustomer | null = null;
      try {
        stripeCustomer = await stripe.customers.retrieve(customerId);
      } catch (_e) {
        stripeCustomer = null;
      }

      const isDeleted = !stripeCustomer || (stripeCustomer as Stripe.DeletedCustomer).deleted;
      const currentEmail = !isDeleted ? (stripeCustomer as Stripe.Customer).email : null;
      const synthetic = isSyntheticBillingEmail(currentEmail);

      if (isDeleted) {
        // Old reference is gone; create a fresh customer below
        customerId = undefined;
      } else if (synthetic) {
        if (billingEmail) {
          // Update Stripe customer email to real email — reuse same id
          await stripe.customers.update(customerId, { email: billingEmail });
        } else {
          // Cannot fix email; check for active subscription before replacing
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 5,
          });
          const hasActive = subs.data.some((s) =>
            ["active", "trialing", "past_due", "unpaid"].includes(s.status)
          );
          if (hasActive) {
            return new Response(JSON.stringify({
              error: "Billing email needs manual correction. Please contact support.",
            }), {
              status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Safe to replace — create new customer without synthetic email
          const fresh = await stripe.customers.create({
            metadata: { user_id: user.id, replaced_customer: customerId },
          });
          customerId = fresh.id;
          await admin.from("billing_customers").upsert({
            user_id: user.id,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          });
        }
      }
      // valid email: reuse as-is, do not overwrite
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billingEmail ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("billing_customers").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: paymentMethodTypes,
      allow_promotion_codes: true,
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancel`,
      metadata: {
        user_id: user.id,
        plan_name: plan,
        billing_cycle,
        founder_price: "true",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_name: plan,
          billing_cycle,
          founder_price: "true",
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error", (e as Error).message);
    return new Response(JSON.stringify({ error: "Checkout creation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

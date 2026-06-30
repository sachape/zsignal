import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

// Webhook: no CORS, no JWT verification (signed by Stripe)

function priceToPlan(priceId: string | null | undefined): { plan: string | null; cycle: string | null } {
  if (!priceId) return { plan: null, cycle: null };
  const map: Record<string, { plan: string; cycle: string }> = {
    [Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") ?? ""]: { plan: "pro", cycle: "monthly" },
    [Deno.env.get("STRIPE_PRICE_PRO_ANNUAL") ?? ""]: { plan: "pro", cycle: "annual" },
    [Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY") ?? ""]: { plan: "growth", cycle: "monthly" },
    [Deno.env.get("STRIPE_PRICE_GROWTH_ANNUAL") ?? ""]: { plan: "growth", cycle: "annual" },
  };
  const m = map[priceId];
  return m ? { plan: m.plan, cycle: m.cycle } : { plan: null, cycle: null };
}

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error("Invalid signature");
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  async function syncSubscription(sub: Stripe.Subscription, fallbackUserId?: string) {
    const userId = (sub.metadata?.user_id as string | undefined) ?? fallbackUserId;
    if (!userId) {
      console.warn("Subscription event without user_id metadata", { sub_id: sub.id });
      return;
    }
    const priceId = sub.items.data[0]?.price?.id ?? null;
    const mapped = priceToPlan(priceId);
    if (!mapped.plan) {
      console.warn("Unknown price id on subscription", { sub_id: sub.id });
    }
    await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan_name: mapped.plan ?? (sub.metadata?.plan_name as string | undefined) ?? null,
      billing_cycle: mapped.cycle ?? (sub.metadata?.billing_cycle as string | undefined) ?? null,
      status: sub.status,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      founder_price: (sub.metadata?.founder_price ?? "true") === "true",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id as string | undefined;
        const customerId = session.customer as string | undefined;
        const purchaseType = session.metadata?.type as string | undefined;

        // ── One-shot credit pack purchase ──
        // Idempotent via UNIQUE(stripe_checkout_session_id) on the ledger.
        if (purchaseType === "credit_pack" && userId && session.payment_status === "paid") {
          const packageId = session.metadata?.package_id as string | undefined;
          const credits = Number(session.metadata?.credits ?? 0);
          if (!packageId || !Number.isFinite(credits) || credits <= 0) {
            console.warn("credit_pack_session_missing_metadata", { session: session.id });
            break;
          }
          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          const { error: ledgerErr } = await admin
            .from("creator_credit_ledger")
            .insert({
              user_id: userId,
              delta: credits,
              reason: "purchase",
              feature: null,
              credit_package_id: packageId,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              metadata: {
                amount_total: session.amount_total ?? null,
                currency: session.currency ?? null,
              },
            });
          if (ledgerErr) {
            // 23505 = unique_violation → already credited, treat as success.
            if (ledgerErr.code !== "23505") {
              console.error("credit_pack_ledger_insert_failed", ledgerErr.message);
            } else {
              console.info("credit_pack_already_credited", { session: session.id });
            }
          } else {
            console.info("credit_pack_credited", { user_id: userId, credits, session: session.id });
          }

          if (customerId) {
            await admin.from("billing_customers").upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            });
          }
          break;
        }

        // ── Subscription checkout (existing behaviour) ──
        if (userId && customerId) {
          await admin.from("billing_customers").upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          });
        }
        if (session.subscription && typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(sub, userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription;
        if (subId && typeof subId === "string") {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook handler error", (e as Error).message);
    return new Response("Handler error", { status: 500 });
  }
});

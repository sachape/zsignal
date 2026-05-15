import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/services/analytics";

export type PlanName = "pro" | "growth";
export type BillingCycle = "monthly" | "annual";

export async function startCheckout(plan: PlanName, billing_cycle: BillingCycle): Promise<void> {
  analytics.checkoutStarted(plan, billing_cycle);
  // Open a blank tab synchronously (still in the user-gesture context) so
  // popup blockers don't interfere, then set its URL once we have it.
  // Using a new tab avoids the full-page redirect that was wiping the current
  // Supabase session from memory and sometimes restoring the wrong account.
  const stripeTab = window.open("about:blank", "_blank");
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan, billing_cycle },
  });
  if (error) {
    stripeTab?.close();
    throw new Error(error.message ?? "Checkout failed");
  }
  const url = (data as { url?: string } | null)?.url;
  if (!url) {
    stripeTab?.close();
    throw new Error("No checkout URL returned");
  }
  if (stripeTab) {
    stripeTab.location.href = url;
  } else {
    window.location.href = url;
  }
}

export async function openBillingPortal(): Promise<void> {
  analytics.billingPortalOpened();
  const portalTab = window.open("about:blank", "_blank");
  const { data, error } = await supabase.functions.invoke("create-customer-portal-session", {
    body: {},
  });
  if (error) {
    portalTab?.close();
    throw new Error(error.message ?? "Portal failed");
  }
  const url = (data as { url?: string } | null)?.url;
  if (!url) {
    portalTab?.close();
    throw new Error("No portal URL returned");
  }
  if (portalTab) {
    portalTab.location.href = url;
  } else {
    window.location.href = url;
  }
}

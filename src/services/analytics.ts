/**
 * Analytics wrapper — Brevo tracker.
 * All calls are no-ops until the Brevo script is loaded in index.html.
 * Safe to call at any time.
 */

declare global {
  interface Window {
    Brevo?: unknown[];
  }
}

function push(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.Brevo = window.Brevo || [];
  (window.Brevo as unknown[]).push(args);
}

export const analytics = {
  identify(email: string, attributes?: Record<string, unknown>) {
    push("identify", { email, ...(attributes && { attributes }) });
  },

  track(event: string, properties?: Record<string, unknown>) {
    push("track", event, properties ? { data: properties } : {});
  },

  // ── Acquisition ───────────────────────────────────────────────────────────

  analysisStarted(channel: string, mode: "full" | "teaser") {
    this.track("analysis_started", { channel, mode });
  },

  analysisCompleted(channel: string, mode: "full" | "teaser") {
    this.track("analysis_completed", { channel, mode });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  signupCompleted(email: string) {
    this.identify(email);
    this.track("signup_completed", { email });
  },

  signinCompleted(email: string) {
    this.identify(email);
    this.track("signin_completed");
  },

  googleSignin() {
    this.track("google_signin");
  },

  // ── Activation ────────────────────────────────────────────────────────────

  twitchConnected(login: string) {
    this.track("twitch_connected", { login });
  },

  // ── Paywall ───────────────────────────────────────────────────────────────

  paywallHit(feature: string, variant: "full_page" | "inline" | "limit_banner") {
    this.track("paywall_hit", { feature, variant });
  },

  upgradeClicked(feature: string, source: "full_page" | "inline" | "limit_banner" | "sidebar") {
    this.track("upgrade_clicked", { feature, source });
  },

  // ── Revenue ───────────────────────────────────────────────────────────────

  checkoutStarted(plan: string, billing_cycle: string) {
    this.track("checkout_started", { plan, billing_cycle });
  },

  checkoutCompleted(plan: string) {
    this.track("checkout_completed", { plan });
  },
};

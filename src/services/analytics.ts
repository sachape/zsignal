import mixpanel from "mixpanel-browser";

const token: string | undefined =
  (import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined) ||
  "ac06a0825fa7a54c685acc4593991341";

if (token) {
  mixpanel.init(token, { track_pageview: true, persistence: "localStorage", api_host: "https://api-eu.mixpanel.com" });
}

function mpTrack(event: string, properties?: Record<string, unknown>) {
  if (!token) return;
  mixpanel.track(event, properties);
}

function mpIdentify(userId: string, properties?: Record<string, unknown>) {
  if (!token) return;
  mixpanel.identify(userId);
  if (properties) mixpanel.people.set(properties);
}

// ── Brevo tracker (kept for email automation) ─────────────────────────────

declare global {
  interface Window {
    Brevo?: unknown[];
  }
}

function brevoPush(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.Brevo = window.Brevo || [];
  (window.Brevo as unknown[]).push(args);
}

// ── Public API ────────────────────────────────────────────────────────────

export const analytics = {
  identify(email: string, attributes?: Record<string, unknown>, listIds?: number[]) {
    brevoPush("identify", { email, ...(attributes && { attributes }), ...(listIds && { listIds }) });
  },

  identifyUser(userId: string, properties?: Record<string, unknown>) {
    mpIdentify(userId, properties);
  },

  track(event: string, properties?: Record<string, unknown>) {
    brevoPush("track", event, properties ? { data: properties } : {});
    mpTrack(event, properties);
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
    this.identify(email, undefined, [6]);
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

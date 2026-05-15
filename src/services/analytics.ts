import mixpanel from "mixpanel-browser";

const token: string | undefined =
  (import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined) ||
  "ac06a0825fa7a54c685acc4593991341";

if (token) {
  mixpanel.init(token, { track_pageview: false, persistence: "localStorage", api_host: "https://api-eu.mixpanel.com" });
}

function mpTrack(event: string, properties?: Record<string, unknown>) {
  if (!token) return;
  mixpanel.track(event, properties);
}

function mpSetPeople(properties: Record<string, unknown>) {
  if (!token) return;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  if (Object.keys(clean).length > 0) mixpanel.people.set(clean);
}

// ── Public API ────────────────────────────────────────────────────────────

export const analytics = {
  identifyUser(userId: string, properties?: {
    email?: string | null;
    name?: string | null;
    plan?: string;
    created_at?: string;
  }) {
    if (!token) return;
    mixpanel.identify(userId);
    const email = properties?.email ?? null;
    const name = properties?.name ?? (email ? email.split("@")[0] : null);
    mpSetPeople({
      $email: email,
      $name: name,
      ...(properties?.plan && { plan: properties.plan }),
      ...(properties?.created_at && { created_at: properties.created_at }),
    });
  },

  setPlan(plan: string) {
    mpSetPeople({ plan });
  },

  pageView() {
    if (!token) return;
    mixpanel.track_pageview();
  },

  track(event: string, properties?: Record<string, unknown>) {
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

  signupCompleted(method?: string) {
    this.track("signup_completed", { ...(method && { method }) });
  },

  signinCompleted(method: string = "email") {
    this.track("signin_completed", { method });
  },

  // ── Activation ────────────────────────────────────────────────────────────

  twitchConnected(login: string) {
    this.track("twitch_connected", { login });
  },

  reportViewed(channel: string, score: number) {
    this.track("report_viewed", { channel, score });
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
    mpSetPeople({ plan });
    this.track("checkout_completed", { plan });
  },

  billingPortalOpened() {
    this.track("billing_portal_opened");
  },
};

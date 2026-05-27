import mixpanel from "mixpanel-browser";
import { metaPixel } from "@/services/metaPixel";

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
    metaPixel.pageView();
    if (!token) return;
    mixpanel.track_pageview();
  },

  track(event: string, properties?: Record<string, unknown>) {
    mpTrack(event, properties);
  },

  // ── Acquisition ───────────────────────────────────────────────────────────

  analysisStarted(channel: string, mode: "full" | "teaser") {
    metaPixel.search(channel);
    this.track("analysis_started", { channel, mode });
  },

  analysisCompleted(channel: string, mode: "full" | "teaser") {
    if (token) mixpanel.people.increment("analyses_count", 1);
    this.track("analysis_completed", { channel, mode });
  },

  analysisFailed(channel: string, reason: string) {
    this.track("analysis_failed", { channel, reason });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  signupCompleted(method?: string) {
    metaPixel.completeRegistration(
      method === "twitch" ? "twitch" : method === "email" ? "email" : "email_or_twitch",
    );
    this.track("signup_completed", { ...(method && { method }) });
  },

  signinCompleted(method: string = "email") {
    this.track("signin_completed", { method });
  },

  // ── Activation ────────────────────────────────────────────────────────────

  twitchConnected(login: string) {
    mpSetPeople({ twitch_connected: true, twitch_login: login });
    this.track("twitch_connected", { login });
  },

  twitchConnectionFailed(code: string) {
    this.track("twitch_connection_failed", { code });
  },

  onboardingCompleted() {
    mpSetPeople({ onboarding_completed: true });
    this.track("onboarding_completed");
  },

  reportViewed(channel: string, score: number) {
    if (token) mixpanel.people.set_once({ first_report_date: new Date().toISOString() });
    this.track("report_viewed", { channel, score });
  },

  reportShared(channel: string) {
    this.track("report_shared", { channel });
  },

  scoreDimensionExpanded(dimension: string, score: number) {
    this.track("score_dimension_expanded", { dimension, score });
  },

  // ── Engagement features ───────────────────────────────────────────────────

  planActionUpdated(status: "done" | "skipped" | "todo") {
    this.track("plan_action_updated", { status });
  },

  questToggled(questId: string, completed: boolean) {
    this.track("quest_toggled", { quest_id: questId, completed });
  },

  competitorOpened(channel: string) {
    this.track("competitor_opened", { channel });
  },

  simulatorPresetUsed(preset: string) {
    this.track("simulator_preset_used", { preset });
  },

  simulatorRun() {
    this.track("simulator_run");
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
    metaPixel.initiateCheckout(plan);
    this.track("checkout_started", { plan, billing_cycle });
  },

  checkoutCompleted(plan: string, value?: number, currency: string = "EUR") {
    mpSetPeople({ plan });
    metaPixel.purchase(value, plan, currency);
    this.track("checkout_completed", { plan, ...(value !== undefined && { value, currency }) });
  },

  /** Fire when the user clicks a CTA after the teaser to unlock the full diagnostic. */
  leadUnlock(intentKey: string) {
    metaPixel.leadUnlock(intentKey);
    this.track("lead_unlock", { intent: intentKey });
  },

  /** Fire only after a real founder reservation/signup submission. */
  leadFounderOffer(intentKey: string) {
    metaPixel.leadFounderOffer(intentKey);
    this.track("lead_founder_offer", { intent: intentKey });
  },

  billingPortalOpened() {
    this.track("billing_portal_opened");
  },
};

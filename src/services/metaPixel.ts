// Meta Pixel wrapper for Streamnco.
// Base script + noscript fallback live in index.html. This module exposes a
// typed, de-duplicated API and dev-only console logs.
//
// Funnel: PageView → Search (analysis started) → ViewContent (teaser result)
//         → Lead (unlock intent / founder reservation) → CompleteRegistration
//         → InitiateCheckout → Purchase.

type FbqArgs = unknown[];
declare global {
  interface Window {
    fbq?: ((...args: FbqArgs) => void) & { callMethod?: (...args: FbqArgs) => void };
    _fbq?: unknown;
  }
}

const PIXEL_ID = "1664633797961616";
const isDev = import.meta.env.DEV;

const fired = new Set<string>();

function safeFbq(...args: FbqArgs): boolean {
  if (typeof window === "undefined") return false;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return false;
  try {
    fbq(...args);
    return true;
  } catch {
    return false;
  }
}

function devLog(label: string, payload?: unknown) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log(`[Meta Pixel] ${label} fired`, payload ?? "");
}

// ── UTM / click-id preservation ──────────────────────────────────────────
// Captured on first landing within the session and kept in sessionStorage
// so the same attribution can be appended throughout the SPA flow.

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
] as const;

type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

const ATTRIBUTION_STORAGE_KEY = "streamnco:attribution";

export function captureAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const existing = readAttribution();
    let updated = false;
    const next: Record<string, string> = { ...existing };
    for (const key of ATTRIBUTION_KEYS) {
      const v = url.searchParams.get(key);
      if (v && !next[key]) {
        next[key] = v;
        updated = true;
      }
    }
    if (updated) sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function readAttribution(): Partial<Record<AttributionKey, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<AttributionKey, string>>;
  } catch {
    return {};
  }
}

// ── Public API ───────────────────────────────────────────────────────────

let pageViewLastPath: string | null = null;

export const metaPixel = {
  pixelId: PIXEL_ID,

  /** Fire on initial load + every SPA route change. */
  pageView() {
    if (typeof window === "undefined") return;
    captureAttributionFromUrl();
    const path = window.location.pathname + window.location.search;
    // Guard against duplicate fires for the exact same URL within the same tick.
    if (pageViewLastPath === path) return;
    pageViewLastPath = path;
    if (safeFbq("track", "PageView")) devLog("PageView", { path });
  },

  /** Analysis started from the landing CTA. */
  search(searchString: string) {
    const q = (searchString ?? "").trim();
    if (!q) return;
    const key = `search:${q.toLowerCase()}`;
    if (fired.has(key)) return;
    fired.add(key);
    const payload = {
      search_string: q,
      content_name: "twitch_channel_analysis",
      platform: "twitch",
    };
    if (safeFbq("track", "Search", payload)) devLog("Search", payload);
  },

  /** Teaser diagnostic result successfully displayed. */
  viewContentTeaser(teaserKey: string) {
    const key = `view:${teaserKey}`;
    if (fired.has(key)) return;
    fired.add(key);
    const payload = {
      content_name: "teaser_analysis_result",
      content_type: "diagnostic",
      platform: "twitch",
    };
    if (safeFbq("track", "ViewContent", payload)) devLog("ViewContent", payload);
  },

  /** User clicked a CTA after the teaser to unlock the full diagnostic. */
  leadUnlock(intentKey: string) {
    const key = `lead:unlock:${intentKey}`;
    if (fired.has(key)) return;
    fired.add(key);
    const payload = {
      lead_type: "unlock_full_diagnostic",
      content_name: "streamnco_diagnostic",
      platform: "twitch",
    };
    if (safeFbq("track", "Lead", payload)) devLog("Lead", payload);
  },

  /** Founder offer — only call after a real reservation/signup action. */
  leadFounderOffer(intentKey: string) {
    const key = `lead:founder:${intentKey}`;
    if (fired.has(key)) return;
    fired.add(key);
    const payload = {
      lead_type: "founder_offer",
      offer: "founder_lifetime",
      product: "streamnco",
    };
    if (safeFbq("track", "Lead", payload)) devLog("Lead", payload);
  },

  /** Streamnco account successfully created. */
  completeRegistration(method: "email" | "twitch" | "email_or_twitch" = "email_or_twitch") {
    const key = "complete_registration";
    if (fired.has(key)) return;
    fired.add(key);
    const payload = {
      registration_method: method,
      product: "streamnco",
    };
    if (safeFbq("track", "CompleteRegistration", payload)) devLog("CompleteRegistration", payload);
  },

  /** Stripe checkout session opened. */
  initiateCheckout(offer = "founder_lifetime") {
    const payload = {
      product: "streamnco",
      offer,
    };
    if (safeFbq("track", "InitiateCheckout", payload)) devLog("InitiateCheckout", payload);
  },

  /** After confirmed successful payment only. */
  purchase(value: number | undefined, offer = "founder_lifetime", currency = "EUR") {
    const key = "purchase";
    if (fired.has(key)) return;
    fired.add(key);
    const payload: Record<string, unknown> = {
      product: "streamnco",
      offer,
      currency,
    };
    if (typeof value === "number" && Number.isFinite(value)) payload.value = value;
    if (safeFbq("track", "Purchase", payload)) devLog("Purchase", payload);
  },
};

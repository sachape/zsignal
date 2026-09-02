// Twitch OAuth service — live flow via twitch-oauth edge function
import { supabase } from "@/integrations/supabase/client";
import { onboardingFlags } from "@/services/onboardingFlags";

const REDIRECT_URI = `${window.location.origin}/twitch/callback`;
const STATE_KEY = "streampulse_twitch_oauth_state";
const STATE_TEASER_KEY = "streampulse_twitch_oauth_teaser_id";
const STATE_MODE_KEY = "streampulse_twitch_oauth_mode";
const STATE_RETURN_KEY = "streamnco_twitch_oauth_return";

type TwitchOAuthErrorCode =
  | "cancelled"
  | "config_unavailable"
  | "invalid_state"
  | "session_bootstrap_failed"
  | "twitch_account_already_linked"
  | "twitch_account_limit_reached"
  | "temporary_unavailable";

type TwitchOAuthFailure = {
  success: false;
  code: TwitchOAuthErrorCode;
  error: string;
};

type TwitchOAuthSuccess = {
  success: true;
  platform_login?: string;
};

export type CompleteTwitchCallbackResult = TwitchOAuthSuccess | TwitchOAuthFailure;

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function mapAuthorizeError(rawError?: string): string {
  const normalized = rawError?.toLowerCase() ?? "";

  if (
    normalized.includes("credentials not configured") ||
    normalized.includes("client") ||
    normalized.includes("redirect")
  ) {
    return "La connexion Twitch est temporairement indisponible. Réessaie dans un instant.";
  }

  return "Impossible de démarrer la connexion Twitch pour le moment. Réessaie dans un instant.";
}

function mapCallbackError(code?: string, rawError?: string): TwitchOAuthFailure {
  const normalizedCode = code?.toLowerCase() ?? "";
  const normalizedError = rawError?.toLowerCase() ?? "";

  if (normalizedCode === "invalid_state") {
    return {
      success: false,
      code: "invalid_state",
      error: "La tentative de connexion a expiré. Réessaie pour relancer Twitch.",
    };
  }

  if (normalizedCode === "twitch_account_already_linked") {
    return {
      success: false,
      code: "twitch_account_already_linked",
      error: "Ce compte Twitch est déjà connecté à un autre compte Streamnco.",
    };
  }

  if (normalizedCode === "twitch_account_limit_reached") {
    return {
      success: false,
      code: "twitch_account_limit_reached",
      error: "Tu as atteint la limite de comptes Twitch connectés pour ton offre actuelle.",
    };
  }

  if (
    normalizedCode === "token_exchange_failed" ||
    normalizedCode === "twitch_user_lookup_failed" ||
    normalizedCode === "connection_store_failed" ||
    normalizedCode === "session_bootstrap_failed" ||
    normalizedError.includes("non-2xx") ||
    normalizedError.includes("token exchange")
  ) {
    return {
      success: false,
      code: "temporary_unavailable",
      error: "La connexion n’a pas pu être finalisée. Réessaie dans un instant.",
    };
  }

  if (
    normalizedCode === "config_unavailable" ||
    normalizedError.includes("redirect") ||
    normalizedError.includes("credentials not configured")
  ) {
    return {
      success: false,
      code: "config_unavailable",
      error: "La configuration Twitch est temporairement indisponible. Réessaie dans un instant.",
    };
  }

  return {
    success: false,
    code: "temporary_unavailable",
    error: "La connexion n’a pas pu être finalisée. Réessaie dans un instant.",
  };
}

/**
 * Build the Twitch authorize URL via the edge function (which holds the client_id),
 * store a CSRF state token, then redirect the browser.
 *
 * If the user comes from a teaser diagnostic, we persist the `teaserId` so we
 * can reconcile the gratuit diagnostic with the enriched data after callback,
 * without re-running an analysis from scratch.
 */
export async function initiateTwitchOAuth(options?: {
  teaserId?: string | null;
  mode?: "add" | "replace";
  returnTo?: string;
}): Promise<void> {
  const nonce = generateNonce();
  sessionStorage.setItem(STATE_KEY, nonce);

  // Internal return path (e.g. re-authorizing Voice Clip scopes). Same-origin
  // relative paths only — never an absolute URL.
  if (options?.returnTo && options.returnTo.startsWith("/")) {
    sessionStorage.setItem(STATE_RETURN_KEY, options.returnTo);
  } else {
    sessionStorage.removeItem(STATE_RETURN_KEY);
  }

  if (options?.teaserId) {
    sessionStorage.setItem(STATE_TEASER_KEY, options.teaserId);
    onboardingFlags.setPendingTeaserId(options.teaserId);
  }

  if (options?.mode) {
    sessionStorage.setItem(STATE_MODE_KEY, options.mode);
  } else {
    sessionStorage.removeItem(STATE_MODE_KEY);
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const fnUrl = `https://${projectId}.supabase.co/functions/v1/twitch-oauth?action=authorize-url&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}&state=${encodeURIComponent(nonce)}`;

  const res = await fetch(fnUrl, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(mapAuthorizeError(data.error));
  }
  window.location.href = data.url;
}

/**
 * Returns the `teaserId` that was associated with the OAuth round-trip, or null.
 * Reads sessionStorage first (fresh tab), falls back to the durable flag.
 */
export function peekPendingTeaserId(): string | null {
  const fromSession = sessionStorage.getItem(STATE_TEASER_KEY);
  const fromFlags = onboardingFlags.getPendingTeaserId();
  return fromSession || fromFlags || null;
}

export function consumePendingTeaserId(): string | null {
  const teaserId = peekPendingTeaserId();
  sessionStorage.removeItem(STATE_TEASER_KEY);
  onboardingFlags.clearPendingTeaserId();
  return teaserId;
}

/** Reads and clears the internal return path stored before the OAuth redirect. */
export function consumeOAuthReturnTo(): string | null {
  const value = sessionStorage.getItem(STATE_RETURN_KEY);
  sessionStorage.removeItem(STATE_RETURN_KEY);
  return value && value.startsWith("/") ? value : null;
}

export function peekOAuthMode(): "add" | "replace" | null {
  return (sessionStorage.getItem(STATE_MODE_KEY) as "add" | "replace" | null) ?? null;
}

export function consumeOAuthMode(): "add" | "replace" | null {
  const mode = peekOAuthMode();
  sessionStorage.removeItem(STATE_MODE_KEY);
  return mode;
}

/**
 * Exchange authorization code for tokens via the backend edge function.
 * Validates the CSRF state, then calls twitch-oauth POST.
 */
export async function completeTwitchCallback(
  code: string,
  state: string,
  mode?: "add" | "replace" | "default",
): Promise<CompleteTwitchCallbackResult> {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expectedState || expectedState !== state) {
    return mapCallbackError("invalid_state");
  }

  // Snapshot whether the user was already authenticated BEFORE calling the
  // edge function. If they were, we must NOT overwrite their session with
  // whatever session the edge function bootstraps for the Twitch OAuth user —
  // that would silently switch them to a second Supabase account (two-accounts
  // bug: connected_accounts row ends up on Account A / Twitch, but the user
  // signs back in as Account B / Gmail and finds nothing).
  const { data: priorSession } = await supabase.auth.getSession();
  const wasAlreadyLoggedIn = !!priorSession.session?.user;

  const { data, error } = await supabase.functions.invoke("twitch-oauth", {
    body: {
      code,
      redirect_uri: REDIRECT_URI,
      ...(mode && mode !== "default" ? { mode } : {}),
    },
  });

  if (error) {
    // Non-2xx from edge function: body is in error.context — parse it for the real code.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.code) return mapCallbackError(body.code as string, body.error as string | undefined);
    } catch (_e) {
      // ignore
    }
    return mapCallbackError(undefined, error.message);
  }
  if (!data?.success) {
    return mapCallbackError(data?.code, data?.error);
  }

  if (!wasAlreadyLoggedIn && data.session?.access_token && data.session?.refresh_token) {
    // New / unauthenticated user: bootstrap their Supabase session from the
    // Twitch OAuth tokens so they become logged-in after the callback.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      return mapCallbackError("session_bootstrap_failed", sessionError.message);
    }
  }

  return { success: true, platform_login: data.platform_login };
}

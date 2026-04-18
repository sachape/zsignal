import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TwitchAccount {
  id: string;
  platform_login: string | null;
  platform_display_name: string | null;
  platform_user_id: string | null;
  created_at: string;
  /** Twitch profile image (joined from twitch_profiles when available). */
  profile_image_url?: string | null;
}

/**
 * Module-level cache of the resolved Twitch identity per StreamPulse user.
 *
 * Why a module cache: previously, every component using this hook owned its
 * own state and every route mount started at `loading=true, account=null`.
 * That made the top-right Twitch control flicker to the disconnected CTA
 * during navigation, even though the connection was still valid. The cache
 * preserves the last known identity across route changes and remounts; the
 * fetch then runs in the background to revalidate without blanking the UI.
 *
 * Status semantics:
 *   - "idle"        → no fetch attempted yet for this user
 *   - "loading"     → first fetch in flight, no cached account yet
 *   - "revalidating"→ fetch in flight but a cached account is already known
 *   - "resolved"    → fetch completed, cache reflects the truth (account or null)
 */
type FetchStatus = "idle" | "loading" | "revalidating" | "resolved";

interface CacheEntry {
  account: TwitchAccount | null;
  status: FetchStatus;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function setEntry(userId: string, entry: CacheEntry) {
  cache.set(userId, entry);
  notify();
}

async function fetchAndCache(userId: string): Promise<void> {
  const existing = cache.get(userId);
  setEntry(userId, {
    account: existing?.account ?? null,
    status: existing?.account ? "revalidating" : "loading",
  });

  const { data: connected } = await supabase
    .from("connected_accounts")
    .select("id, platform_login, platform_display_name, platform_user_id, created_at")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .maybeSingle();

  if (!connected) {
    setEntry(userId, { account: null, status: "resolved" });
    return;
  }

  // Canonical Twitch identity resolution.
  //
  // Priority order — must match what dashboard/search/rankings surfaces use:
  //   1. twitch_profiles row (cached enriched profile from a prior analysis run)
  //   2. twitch-live-fetch edge function (authoritative — uses the user's OAuth
  //      token to call Helix /users; this is the same source that powers the
  //      report identity header and dashboard avatar)
  //   3. twitch-public-lookup as a final best-effort using the public login
  //
  // Historically only #1 + #3 were attempted, but #1 is rarely populated
  // (no code path writes twitch_profiles for the connected user outside of
  // analysis ingestion) and #3 sometimes fails or returns no image, leaving
  // the header stuck on initials while every other surface had the avatar.
  let avatar: string | null = null;

  const { data: profile } = await supabase
    .from("twitch_profiles")
    .select("profile_image_url, twitch_user_id, login")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.profile_image_url) avatar = profile.profile_image_url;

  if (!avatar) {
    try {
      const { data: live } = await supabase.functions.invoke("twitch-live-fetch", {
        body: {},
      });
      const url = live?.profile?.profile_image_url ?? null;
      if (url) avatar = url;
    } catch {
      // non-fatal — fall through to public lookup
    }
  }

  if (!avatar && connected.platform_login) {
    try {
      const { data: lookup } = await supabase.functions.invoke("twitch-public-lookup", {
        body: { login: connected.platform_login },
      });
      const url = lookup?.profile?.profile_image_url ?? lookup?.profile_image_url ?? null;
      if (url) avatar = url;
    } catch {
      // ignore — avatar stays null and UI falls back to initials
    }
  }

  setEntry(userId, {
    account: { ...connected, profile_image_url: avatar },
    status: "resolved",
  });
}

function ensureFetch(userId: string) {
  if (inflight.has(userId)) return inflight.get(userId)!;
  const p = fetchAndCache(userId).finally(() => {
    inflight.delete(userId);
  });
  inflight.set(userId, p);
  return p;
}

export function useTwitchConnection() {
  const { user } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const tick = () => force((n) => n + 1);
    listeners.add(tick);
    return () => {
      listeners.delete(tick);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const entry = cache.get(user.id);
    // Trigger a fetch on first sight of this user, or refresh stale data.
    if (!entry || entry.status === "idle") {
      ensureFetch(user.id);
    }
  }, [user]);

  if (!user) {
    // Logged out: not loading, not connected. No flicker risk because there
    // is no previously-known identity to preserve.
    return {
      isConnected: false,
      account: null as TwitchAccount | null,
      loading: false,
      revalidating: false,
      /**
       * `true` while the very first resolution is in flight AND no cached
       * identity exists yet. Components should treat this as "unknown",
       * not as "disconnected".
       */
      initializing: false,
    };
  }

  const entry = cache.get(user.id);
  const account = entry?.account ?? null;
  const status: FetchStatus = entry?.status ?? "loading";
  const initializing = status === "loading" && !account;
  const revalidating = status === "revalidating";

  return {
    isConnected: !!account,
    account,
    // Kept for backwards compatibility: `loading` is true only when we have
    // no cached identity yet. Once we have one, navigations no longer flip
    // this back to true.
    loading: initializing,
    revalidating,
    initializing,
  };
}

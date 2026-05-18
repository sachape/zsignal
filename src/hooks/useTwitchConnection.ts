import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TwitchAccount {
  id: string;
  platform_login: string | null;
  platform_display_name: string | null;
  platform_user_id: string | null;
  created_at: string;
  profile_image_url?: string | null;
}

// ── Active account persistence ───────────────────────────────────────────────
// Source of truth: user_preferences.active_connected_account_id (Lovable Cloud).
// localStorage is kept as a hydration cache for offline / pre-fetch UX only.

const ACTIVE_KEY = (userId: string) => `streamnco:active_twitch:${userId}`;

function getCachedActiveLogin(userId: string): string | null {
  try { return localStorage.getItem(ACTIVE_KEY(userId)); } catch { return null; }
}

function setCachedActiveLogin(userId: string, login: string): void {
  try { localStorage.setItem(ACTIVE_KEY(userId), login); } catch { /* noop */ }
}

// Module-level cache of resolved DB preference per user (id of the active connected account).
const activeIdCache = new Map<string, string | null>();

async function fetchActiveAccountId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_preferences")
    .select("active_connected_account_id")
    .eq("user_id", userId)
    .maybeSingle();
  // Cast: the column was just added; types may not yet reflect it.
  const id = (data as { active_connected_account_id?: string | null } | null)
    ?.active_connected_account_id ?? null;
  activeIdCache.set(userId, id);
  return id;
}

async function persistActiveAccount(userId: string, accountId: string): Promise<void> {
  // Upsert preserves other preference fields (preferred_niche, preferred_language).
  await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, active_connected_account_id: accountId } as never,
      { onConflict: "user_id" },
    );
  activeIdCache.set(userId, accountId);
}

/**
 * Switch the active Twitch account.
 * - Updates UI immediately (via cache + notify)
 * - Persists to DB (source of truth)
 * - Mirrors to localStorage as hydration cache
 * - DB failure does NOT break the UI switch
 */
export function switchActiveAccount(userId: string, login: string, accountId?: string): void {
  setCachedActiveLogin(userId, login);
  if (accountId) {
    activeIdCache.set(userId, accountId);
    void persistActiveAccount(userId, accountId).catch(() => { /* non-fatal */ });
  }
  notify();
}

// ── Module-level cache ────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "revalidating" | "resolved";

interface CacheEntry {
  accounts: TwitchAccount[];
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

async function resolveAvatar(login: string, userId: string, isPrimary: boolean): Promise<string | null> {
  // 1. twitch_profiles (written during analysis ingestion)
  const { data: profile } = await supabase
    .from("twitch_profiles")
    .select("profile_image_url")
    .eq("login", login)
    .maybeSingle();
  if (profile?.profile_image_url) return profile.profile_image_url;

  // 2. twitch-live-fetch (uses OAuth token — only reliable for the primary account)
  if (isPrimary) {
    try {
      const { data: live } = await supabase.functions.invoke("twitch-live-fetch", { body: {} });
      const url = live?.profile?.profile_image_url ?? null;
      if (url) return url;
    } catch { /* non-fatal */ }
  }

  // 3. Public lookup (works for any login)
  try {
    const { data: lookup } = await supabase.functions.invoke("twitch-public-lookup", { body: { login } });
    const url = lookup?.profile?.profile_image_url ?? lookup?.profile_image_url ?? null;
    if (url) return url;
  } catch { /* ignore */ }

  return null;
}

async function fetchAndCache(userId: string): Promise<void> {
  const existing = cache.get(userId);
  setEntry(userId, {
    accounts: existing?.accounts ?? [],
    status: existing?.accounts.length ? "revalidating" : "loading",
  });

  // Fetch accounts + active preference in parallel
  const [accountsRes] = await Promise.all([
    supabase
      .from("connected_accounts")
      .select("id, platform_login, platform_display_name, platform_user_id, created_at")
      .eq("user_id", userId)
      .eq("platform", "twitch")
      .order("created_at", { ascending: true }),
    fetchActiveAccountId(userId).catch(() => null),
  ]);

  const rows = accountsRes.data;
  if (!rows || rows.length === 0) {
    setEntry(userId, { accounts: [], status: "resolved" });
    return;
  }

  // Resolve avatars in parallel
  const accounts: TwitchAccount[] = await Promise.all(
    rows.map(async (row, i) => {
      const login = row.platform_login ?? "";
      const avatar = login ? await resolveAvatar(login, userId, i === 0) : null;
      return { ...row, profile_image_url: avatar };
    }),
  );

  setEntry(userId, { accounts, status: "resolved" });
}

export function invalidateTwitchCache(userId: string) {
  cache.delete(userId);
  inflight.delete(userId);
  activeIdCache.delete(userId);
  notify();
}

function ensureFetch(userId: string) {
  if (inflight.has(userId)) return inflight.get(userId)!;
  const p = fetchAndCache(userId).finally(() => { inflight.delete(userId); });
  inflight.set(userId, p);
  return p;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTwitchConnection() {
  const { user } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    const tick = () => force((n) => n + 1);
    listeners.add(tick);
    return () => { listeners.delete(tick); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const entry = cache.get(user.id);
    if (!entry || entry.status === "idle") ensureFetch(user.id);
  }, [user]);

  if (!user) {
    return {
      isConnected: false,
      accounts: [] as TwitchAccount[],
      account: null as TwitchAccount | null,
      loading: false,
      revalidating: false,
      initializing: false,
    };
  }

  const entry = cache.get(user.id);
  const accounts = entry?.accounts ?? [];
  const status: FetchStatus = entry?.status ?? "loading";
  const initializing = status === "loading" && accounts.length === 0;
  const revalidating = status === "revalidating";

  // Resolve active account, with fallback chain:
  // 1. DB preference (source of truth) — match by connected_account.id
  // 2. localStorage cache — match by login (legacy / pre-hydration)
  // 3. First account
  let account: TwitchAccount | null = null;
  const dbActiveId = activeIdCache.get(user.id) ?? null;
  if (dbActiveId) {
    account = accounts.find((a) => a.id === dbActiveId) ?? null;
  }
  if (!account) {
    const cachedLogin = getCachedActiveLogin(user.id);
    if (cachedLogin) {
      account = accounts.find((a) => a.platform_login === cachedLogin) ?? null;
    }
  }
  if (!account) account = accounts[0] ?? null;

  // Self-heal: if DB preference points to a non-existent/non-owned account,
  // silently promote the fallback to be the persisted preference.
  if (dbActiveId && accounts.length > 0 && !accounts.some((a) => a.id === dbActiveId) && account) {
    void persistActiveAccount(user.id, account.id).catch(() => { /* non-fatal */ });
  }

  return {
    isConnected: accounts.length > 0,
    accounts,
    account,
    loading: initializing,
    revalidating,
    initializing,
  };
}

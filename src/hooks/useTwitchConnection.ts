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

// ── Active account (localStorage) ────────────────────────────────────────────

const ACTIVE_KEY = (userId: string) => `streamnco:active_twitch:${userId}`;

function getActiveLogin(userId: string): string | null {
  try { return localStorage.getItem(ACTIVE_KEY(userId)); } catch { return null; }
}

export function switchActiveAccount(userId: string, login: string): void {
  try { localStorage.setItem(ACTIVE_KEY(userId), login); } catch { /* noop */ }
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

  const { data: rows } = await supabase
    .from("connected_accounts")
    .select("id, platform_login, platform_display_name, platform_user_id, created_at")
    .eq("user_id", userId)
    .eq("platform", "twitch")
    .order("created_at", { ascending: true });

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

  // Active account = the one matching the stored login, or the first one
  const activeLogin = getActiveLogin(user.id);
  const account = (activeLogin ? accounts.find((a) => a.platform_login === activeLogin) : null)
    ?? accounts[0]
    ?? null;

  return {
    isConnected: accounts.length > 0,
    accounts,
    account,
    loading: initializing,
    revalidating,
    initializing,
  };
}

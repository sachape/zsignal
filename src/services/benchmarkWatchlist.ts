/**
 * Watchlist of tracked competitor channels.
 * Source of truth: Lovable Cloud database (`watchlist_entries`).
 * An in-memory cache mirrors the DB so existing synchronous getters keep working.
 */

import { supabase } from "@/integrations/supabase/client";

export interface WatchlistEntry {
  login: string;
  display_name: string;
  category?: string | null;
  avatar_url?: string | null;
  added_at: string;
}

const cache = new Map<string, WatchlistEntry[]>(); // userId -> entries
const CHANGE_EVENT = "streampulse:watchlist-changed";

function key(userId: string | null | undefined): string {
  return userId ?? "anon";
}

function emit() {
  try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)); } catch { /* noop */ }
}

function rowToEntry(row: {
  login: string;
  display_name: string | null;
  game_name: string | null;
  profile_image_url: string | null;
  created_at: string;
}): WatchlistEntry {
  return {
    login: row.login,
    display_name: row.display_name ?? row.login,
    category: row.game_name,
    avatar_url: row.profile_image_url,
    added_at: row.created_at,
  };
}

/** Load watchlist from the database into the in-memory cache. */
export async function loadWatchlistFromDb(userId: string | null | undefined): Promise<WatchlistEntry[]> {
  if (!userId) {
    cache.set("anon", []);
    return [];
  }
  const { data, error } = await supabase
    .from("watchlist_entries")
    .select("login, display_name, game_name, profile_image_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    cache.set(userId, cache.get(userId) ?? []);
    return cache.get(userId) ?? [];
  }
  const entries = (data ?? []).map(rowToEntry);
  cache.set(userId, entries);
  emit();
  return entries;
}

export function getWatchlist(userId: string | null | undefined): WatchlistEntry[] {
  return cache.get(key(userId)) ?? [];
}

export function isInWatchlist(userId: string | null | undefined, login: string): boolean {
  const lower = login.toLowerCase();
  return getWatchlist(userId).some((e) => e.login.toLowerCase() === lower);
}

export async function addToWatchlist(
  userId: string | null | undefined,
  entry: Omit<WatchlistEntry, "added_at">,
): Promise<WatchlistEntry[]> {
  const lower = entry.login.toLowerCase();
  if (!userId) {
    const current = (cache.get("anon") ?? []).filter((e) => e.login.toLowerCase() !== lower);
    const next = [{ ...entry, added_at: new Date().toISOString() }, ...current].slice(0, 50);
    cache.set("anon", next);
    emit();
    return next;
  }
  // Optimistic
  const current = (cache.get(userId) ?? []).filter((e) => e.login.toLowerCase() !== lower);
  const optimistic: WatchlistEntry = { ...entry, added_at: new Date().toISOString() };
  const next = [optimistic, ...current].slice(0, 50);
  cache.set(userId, next);
  emit();

  const { error } = await supabase.from("watchlist_entries").upsert(
    {
      user_id: userId,
      platform: "twitch",
      login: entry.login,
      display_name: entry.display_name,
      game_name: entry.category ?? null,
      profile_image_url: entry.avatar_url ?? null,
    },
    { onConflict: "user_id,platform,login" },
  );
  if (error) await loadWatchlistFromDb(userId);
  return cache.get(userId) ?? next;
}

export async function patchWatchlistEntry(
  userId: string | null | undefined,
  login: string,
  patch: Partial<WatchlistEntry>,
): Promise<void> {
  const lower = login.toLowerCase();
  const current = (cache.get(key(userId)) ?? []).map((e) =>
    e.login.toLowerCase() === lower ? { ...e, ...patch } : e,
  );
  cache.set(key(userId), current);
  emit();
  if (!userId) return;
  const dbPatch: { display_name?: string; game_name?: string | null; profile_image_url?: string | null } = {};
  if ("display_name" in patch && patch.display_name !== undefined) dbPatch.display_name = patch.display_name;
  if ("category" in patch) dbPatch.game_name = patch.category ?? null;
  if ("avatar_url" in patch) dbPatch.profile_image_url = patch.avatar_url ?? null;
  if (Object.keys(dbPatch).length === 0) return;
  await supabase
    .from("watchlist_entries")
    .update(dbPatch)
    .eq("user_id", userId)
    .eq("login", login);
}

export async function removeFromWatchlist(
  userId: string | null | undefined,
  login: string,
): Promise<WatchlistEntry[]> {
  const lower = login.toLowerCase();
  const next = (cache.get(key(userId)) ?? []).filter((e) => e.login.toLowerCase() !== lower);
  cache.set(key(userId), next);
  emit();
  if (userId) {
    await supabase.from("watchlist_entries").delete().eq("user_id", userId).eq("login", login);
  }
  return next;
}

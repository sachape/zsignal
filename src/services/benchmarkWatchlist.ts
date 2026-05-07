/**
 * Lightweight benchmark watchlist.
 * Persisted in localStorage, scoped per authenticated user (or "anon").
 * Keeps the API minimal so we don't overbuild before there is real demand.
 */

export interface WatchlistEntry {
  login: string;
  display_name: string;
  category?: string | null;
  avatar_url?: string | null;
  added_at: string;
}

const KEY_PREFIX = "streampulse:watchlist:";

function storageKey(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

function read(userId: string | null | undefined): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WatchlistEntry[];
  } catch {
    return [];
  }
}

function write(userId: string | null | undefined, entries: WatchlistEntry[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent("streampulse:watchlist-changed"));
  } catch {
    // ignore quota / disabled storage
  }
}

export function getWatchlist(userId: string | null | undefined): WatchlistEntry[] {
  return read(userId);
}

export function isInWatchlist(
  userId: string | null | undefined,
  login: string,
): boolean {
  const lower = login.toLowerCase();
  return read(userId).some((e) => e.login.toLowerCase() === lower);
}

export function addToWatchlist(
  userId: string | null | undefined,
  entry: Omit<WatchlistEntry, "added_at">,
): WatchlistEntry[] {
  const lower = entry.login.toLowerCase();
  const current = read(userId).filter((e) => e.login.toLowerCase() !== lower);
  const next: WatchlistEntry[] = [
    { ...entry, added_at: new Date().toISOString() },
    ...current,
  ].slice(0, 50);
  write(userId, next);
  return next;
}

export function removeFromWatchlist(
  userId: string | null | undefined,
  login: string,
): WatchlistEntry[] {
  const lower = login.toLowerCase();
  const next = read(userId).filter((e) => e.login.toLowerCase() !== lower);
  write(userId, next);
  return next;
}

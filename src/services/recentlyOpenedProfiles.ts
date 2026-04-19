/**
 * Tracks streamer profiles the user has recently opened in the benchmark
 * surfaces. Used as a benchmark seed source for the global Competitors page
 * when the connected account has too little recent personal data to seed
 * candidate discovery on its own.
 *
 * Lightweight on purpose: localStorage, scoped per user, capped at 10 entries.
 */

export interface RecentlyOpenedProfile {
  login: string;
  display_name: string;
  category: string | null;
  language: string | null;
  opened_at: string;
}

const KEY_PREFIX = "streampulse:recent-profiles:";
const MAX_ENTRIES = 10;

function storageKey(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

function read(userId: string | null | undefined): RecentlyOpenedProfile[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentlyOpenedProfile[];
  } catch {
    return [];
  }
}

function write(userId: string | null | undefined, entries: RecentlyOpenedProfile[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function getRecentlyOpenedProfiles(
  userId: string | null | undefined,
): RecentlyOpenedProfile[] {
  return read(userId);
}

export function trackOpenedProfile(
  userId: string | null | undefined,
  entry: Omit<RecentlyOpenedProfile, "opened_at">,
): void {
  if (!entry.login) return;
  const lower = entry.login.toLowerCase();
  const current = read(userId).filter((e) => e.login.toLowerCase() !== lower);
  const next: RecentlyOpenedProfile[] = [
    { ...entry, opened_at: new Date().toISOString() },
    ...current,
  ].slice(0, MAX_ENTRIES);
  write(userId, next);
}

/**
 * Returns the most frequent category among recently opened profiles.
 * Used as a benchmark seed when the connected account itself lacks signal.
 */
export function getDominantOpenedCategory(
  userId: string | null | undefined,
): { category: string; sample_login: string } | null {
  const entries = read(userId).filter((e) => e.category && e.category.trim());
  if (!entries.length) return null;
  const counts = new Map<string, { count: number; login: string }>();
  for (const e of entries) {
    const cat = e.category as string;
    const existing = counts.get(cat);
    if (existing) existing.count += 1;
    else counts.set(cat, { count: 1, login: e.login });
  }
  let best: { cat: string; count: number; login: string } | null = null;
  for (const [cat, { count, login }] of counts) {
    if (!best || count > best.count) best = { cat, count, login };
  }
  return best ? { category: best.cat, sample_login: best.login } : null;
}

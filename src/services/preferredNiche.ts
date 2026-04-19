/**
 * User-selected reference niche for benchmark exploration.
 *
 * Used as a TRUSTWORTHY fallback when the personal benchmark signal
 * is too weak to surface direct competitors. Stored locally per user.
 */

export interface PreferredNiche {
  category: string;
  language: string;
  set_at: string;
}

const KEY_PREFIX = "streampulse:preferred-niche:";
const EVENT = "streampulse:preferred-niche-changed";

function key(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

export function getPreferredNiche(
  userId: string | null | undefined,
): PreferredNiche | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.category) return null;
    return parsed as PreferredNiche;
  } catch {
    return null;
  }
}

export function setPreferredNiche(
  userId: string | null | undefined,
  category: string,
  language = "fr",
): PreferredNiche {
  const value: PreferredNiche = {
    category,
    language,
    set_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(key(userId), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore
  }
  return value;
}

export function clearPreferredNiche(userId: string | null | undefined): void {
  try {
    localStorage.removeItem(key(userId));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore
  }
}

/** Common niches offered in the chooser. Kept small and meaningful. */
export const NICHE_SUGGESTIONS: { category: string; label: string }[] = [
  { category: "Just Chatting", label: "Just Chatting" },
  { category: "League of Legends", label: "League of Legends" },
  { category: "VALORANT", label: "VALORANT" },
  { category: "Grand Theft Auto V", label: "GTA V / RP" },
  { category: "Minecraft", label: "Minecraft" },
  { category: "Counter-Strike", label: "Counter-Strike" },
  { category: "Fortnite", label: "Fortnite" },
  { category: "World of Warcraft", label: "World of Warcraft" },
  { category: "Music", label: "Music" },
  { category: "Art", label: "Art / Création" },
  { category: "Slots", label: "Slots / Casino" },
  { category: "Sports", label: "Sports" },
];

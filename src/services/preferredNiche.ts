/**
 * User-selected reference niche for benchmark exploration.
 * Source of truth: Lovable Cloud database (`user_preferences`).
 * In-memory cache keeps existing synchronous getter usable.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PreferredNiche {
  category: string;
  language: string;
  set_at: string;
}

const EVENT = "streampulse:preferred-niche-changed";
const cache = new Map<string, PreferredNiche | null>(); // userId -> niche

function ukey(userId: string | null | undefined): string {
  return userId ?? "anon";
}

function emit() {
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* noop */ }
}

export async function loadPreferredNicheFromDb(
  userId: string | null | undefined,
): Promise<PreferredNiche | null> {
  if (!userId) {
    cache.set("anon", null);
    return null;
  }
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferred_niche, preferred_language, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.preferred_niche) {
    cache.set(userId, null);
    emit();
    return null;
  }
  const value: PreferredNiche = {
    category: data.preferred_niche,
    language: data.preferred_language ?? "fr",
    set_at: data.updated_at,
  };
  cache.set(userId, value);
  emit();
  return value;
}

export function getPreferredNiche(
  userId: string | null | undefined,
): PreferredNiche | null {
  return cache.get(ukey(userId)) ?? null;
}

export async function setPreferredNiche(
  userId: string | null | undefined,
  category: string,
  language = "fr",
): Promise<PreferredNiche> {
  const value: PreferredNiche = {
    category,
    language,
    set_at: new Date().toISOString(),
  };
  cache.set(ukey(userId), value);
  emit();
  if (userId) {
    await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        preferred_niche: category,
        preferred_language: language,
      },
      { onConflict: "user_id" },
    );
  }
  return value;
}

export async function clearPreferredNiche(userId: string | null | undefined): Promise<void> {
  cache.set(ukey(userId), null);
  emit();
  if (userId) {
    await supabase.from("user_preferences").update({ preferred_niche: null }).eq("user_id", userId);
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

// Plan-based access window for analysis history.
// Free plan = last 30 days only. Pro/Growth/Agency = unlimited (returns null).
// Enforced at the data-query layer so that Free users cannot accidentally
// fetch older history through normal app queries.

import { supabase } from "@/integrations/supabase/client";

const FREE_HISTORY_DAYS = 30;
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const CACHE = new Map<string, { cutoffISO: string | null; at: number }>();
const TTL_MS = 60_000;

/**
 * Returns the oldest `created_at` allowed for this user's history queries.
 * - `null` means unlimited (paid plans).
 * - An ISO string means rows older than this must be filtered out.
 */
export async function getHistoryCutoffISO(userId: string): Promise<string | null> {
  const cached = CACHE.get(userId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.cutoffISO;

  const { data } = await supabase
    .from("subscriptions")
    .select("plan_name, status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = data?.status ?? null;
  const plan = (status && ACTIVE_STATUSES.has(status) ? (data?.plan_name ?? "free") : "free") as
    | "free" | "pro" | "growth" | "agency";

  const cutoffISO = plan === "free"
    ? new Date(Date.now() - FREE_HISTORY_DAYS * 86_400_000).toISOString()
    : null;

  CACHE.set(userId, { cutoffISO, at: Date.now() });
  return cutoffISO;
}

export function invalidateHistoryCutoffCache(userId: string): void {
  CACHE.delete(userId);
}

export const FREE_HISTORY_WINDOW_DAYS = FREE_HISTORY_DAYS;

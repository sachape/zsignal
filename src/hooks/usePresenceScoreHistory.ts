import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConnectedAccount, PresenceScoreResult } from "@/types/networks";
import { computePresenceScore } from "@/services/presenceScore";

export interface PresenceSnapshot {
  id: string;
  score: number;
  snapshot_date: string;
  twitch_score: number | null;
  youtube_score: number | null;
  tiktok_score: number | null;
  instagram_score: number | null;
}

interface UsePresenceScoreHistoryReturn {
  history: PresenceSnapshot[];
  loading: boolean;
  saveSnapshot: (accounts: ConnectedAccount[], hasTwitchOAuth: boolean) => Promise<void>;
}

export function usePresenceScoreHistory(): UsePresenceScoreHistoryReturn {
  const { user } = useAuth();
  const [history, setHistory] = useState<PresenceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("creator_presence_scores")
      .select("id, score, snapshot_date, twitch_score, youtube_score, tiktok_score, instagram_score")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(30);
    setHistory((data as PresenceSnapshot[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const saveSnapshot = useCallback(
    async (accounts: ConnectedAccount[], hasTwitchOAuth: boolean) => {
      if (!user) return;
      const result: PresenceScoreResult = computePresenceScore(accounts, hasTwitchOAuth);
      const today = new Date().toISOString().slice(0, 10);

      const platformScore = (platform: string) => {
        const acc = accounts.find((a) => a.platform === platform);
        if (!acc) return null;
        const active = acc.connection_status === "connected" || acc.connection_status === "manual";
        return active ? (acc.username ? 65 : 40) : 0;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("creator_presence_scores")
        .upsert({
          user_id:               user.id,
          score:                 result.total,
          presence_score:        result.presencePoints,
          consistency_score:     result.consistencyPoints,
          diversification_score: result.diversificationPoints,
          twitch_score:          hasTwitchOAuth ? 85 : platformScore("twitch"),
          youtube_score:         platformScore("youtube"),
          tiktok_score:          platformScore("tiktok"),
          instagram_score:       platformScore("instagram"),
          diagnosis:             result.diagnosis,
          snapshot_date:         today,
        }, { onConflict: "user_id,snapshot_date" });

      fetchHistory();
    },
    [user, fetchHistory],
  );

  return { history, loading, saveSnapshot };
}

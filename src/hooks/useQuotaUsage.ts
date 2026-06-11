import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/hooks/usePlan";
import { quotaFor } from "@/lib/quotas";

export interface QuotaUsage {
  plan: string;
  visualsUsed: number;
  visualsLimit: number;
  visualsRemaining: number;
  clipsUsed: number;
  clipsLimit: number;
  clipsRemaining: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useQuotaUsage(): QuotaUsage {
  const { user } = useAuth();
  const { plan, loading: planLoading } = usePlan();
  const [visualsUsed, setVisualsUsed] = useState(0);
  const [clipsUsed, setClipsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setVisualsUsed(0);
      setClipsUsed(0);
      setLoading(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("get_user_quota_usage", { p_user_id: user.id });
    const row = (data ?? {}) as { visuals_used?: number; clips_used?: number };
    setVisualsUsed(Number(row.visuals_used ?? 0));
    setClipsUsed(Number(row.clips_used ?? 0));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const visualsLimit = quotaFor(plan, "visual");
  const clipsLimit = quotaFor(plan, "clip");

  return {
    plan,
    visualsUsed,
    visualsLimit,
    visualsRemaining: Math.max(0, visualsLimit - visualsUsed),
    clipsUsed,
    clipsLimit,
    clipsRemaining: Math.max(0, clipsLimit - clipsUsed),
    loading: loading || planLoading,
    refresh: load,
  };
}

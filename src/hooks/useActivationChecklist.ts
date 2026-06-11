import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivationStepsState {
  twitchConnected: boolean;
  hasReport: boolean;
  hasClip: boolean;
  hasVisual: boolean;
  hasQueueItem: boolean;
  loading: boolean;
}

interface Input {
  userId: string | null | undefined;
  twitchConnected: boolean;
  hasReport: boolean;
}

/**
 * Computes activation checklist step states from existing tables.
 * Twitch + report come from dashboard state; the rest are counted server-side.
 */
export function useActivationChecklist({ userId, twitchConnected, hasReport }: Input): ActivationStepsState {
  const [hasClip, setHasClip] = useState(false);
  const [hasVisual, setHasVisual] = useState(false);
  const [hasQueueItem, setHasQueueItem] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    (async () => {
      const [clipRes, visualRes, queueRes] = await Promise.all([
        supabase
          .from("creator_video_generation_jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "succeeded"),
        supabase
          .from("visual_generation_jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "succeeded"),
        supabase
          .from("creator_content_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      if (!active) return;
      setHasClip((clipRes.count ?? 0) > 0);
      setHasVisual((visualRes.count ?? 0) > 0);
      setHasQueueItem((queueRes.count ?? 0) > 0);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return {
    twitchConnected,
    hasReport,
    hasClip,
    hasVisual,
    hasQueueItem,
    loading,
  };
}

// V3D — Hook to read clip generation jobs for a content item, with polling while active.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { VideoGenerationStage } from "@/services/videoGeneration";

export type VideoJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface VideoGenerationJob {
  id: string;
  user_id: string;
  content_item_id: string;
  source_type: "upload" | "storage_url" | "direct_url" | "twitch_vod" | "youtube_vod";
  source_url: string | null;
  source_storage_path: string | null;
  start_time_seconds: number;
  end_time_seconds: number;
  duration_seconds: number;
  output_format: string;
  output_storage_path: string | null;
  output_url: string | null;
  status: VideoJobStatus;
  error_code: string | null;
  error_message: string | null;
  progress: number | null;
  generation_stage: VideoGenerationStage;
  callback_status: "received" | "accepted" | "rejected" | null;
  worker_started_at: string | null;
  worker_last_seen_at: string | null;
  worker_completed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const ACTIVE_STATUSES: VideoJobStatus[] = ["queued", "processing"];

export function useVideoJobsForItem(contentItemId: string | null) {
  const { user } = useAuth();
  const [job, setJob] = useState<VideoGenerationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLatest = useCallback(async () => {
    if (!user || !contentItemId) { setJob(null); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("creator_video_generation_jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("content_item_id", contentItemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { setJob(null); return; }
    setJob((data as VideoGenerationJob | null) ?? null);
  }, [user, contentItemId]);

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      if (cancelled) return;
      setLoading(true);
      await fetchLatest();
      setLoading(false);
      // Schedule next poll only if job is active.
      if (cancelled) return;
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        // We can't read latest job here synchronously; just re-run loop and decide inside.
        loop();
      }, 4000);
    }
    // Initial fetch + polling.
    loop();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchLatest]);

  // Stop polling early if job is in a terminal state.
  useEffect(() => {
    if (job && !ACTIVE_STATUSES.includes(job.status) && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [job]);

  return { job, loading, refetch: fetchLatest };
}

export function useActiveVideoJob() {
  const { user } = useAuth();
  const [activeJob, setActiveJob] = useState<VideoGenerationJob | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchActive = useCallback(async () => {
    if (!user) { setActiveJob(null); return; }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("creator_video_generation_jobs")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveJob(error ? null : ((data as VideoGenerationJob | null) ?? null));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loop() {
      if (cancelled) return;
      await fetchActive();
      if (cancelled) return;
      const timer = window.setTimeout(loop, activeJob ? 4000 : 8000);
      return () => window.clearTimeout(timer);
    }
    loop();
    return () => { cancelled = true; };
  }, [fetchActive, activeJob]);

  return { activeJob, loading, refetch: fetchActive };
}

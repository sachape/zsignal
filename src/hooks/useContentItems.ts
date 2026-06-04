import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContentPlatform =
  | "youtube_shorts"
  | "tiktok"
  | "instagram"
  | "community"
  | "twitch_clip";

export type ContentStatus =
  | "idea"
  | "to_produce"
  | "to_generate"
  | "generating"
  | "draft_ready"
  | "ready"
  | "uploaded"
  | "published"
  | "published_manually"
  | "ignored";
export type ContentPriority = "low" | "medium" | "high";
export type YouTubePrivacyStatus = "private" | "unlisted" | "public";
export type SourcePlatform = "twitch" | "youtube" | "manual";
export type GenerationStatus = "pending" | "queued" | "processing" | "succeeded" | "failed" | "unavailable";

export interface ContentItem {
  id: string;
  user_id: string;
  live_session_id: string | null;
  platform: ContentPlatform;
  title: string;
  description: string | null;
  hashtags: string[];
  status: ContentStatus;
  priority: ContentPriority;
  recommended_publish_at: string | null;
  published_at: string | null;
  notes: string | null;
  source_idea_id: string | null;
  format: string | null;
  duration: string | null;
  reason: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  youtube_uploaded_at: string | null;
  youtube_privacy_status: YouTubePrivacyStatus | null;
  // V3C — Clip Draft Generator
  source_platform: SourcePlatform | null;
  source_video_url: string | null;
  source_start_time: number | null;
  source_end_time: number | null;
  source_duration: number | null;
  generated_video_url: string | null;
  /** Permanent pointer for media uploaded manually (or by the worker into our bucket). */
  generated_video_storage_bucket: string | null;
  generated_video_storage_path: string | null;
  thumbnail_url: string | null;
  generation_status: GenerationStatus | null;
  generation_error: string | null;
  // V3.5 — Editorial variants & opportunity scoring
  title_variants: Array<{ style: string; label: string; value: string }>;
  selected_title_variant: string | null;
  description_variants: Array<{ style: string; label: string; value: string }>;
  selected_description_variant: string | null;
  hashtag_variants: Array<{ style: string; label: string; tags: string[] }>;
  selected_hashtags: string[];
  opportunity_score: number | null;
  opportunity_label: string | null;
  opportunity_reason: string | null;
  // V3.5 — Post-publish metrics
  published_url: string | null;
  published_platform: string | null;
  external_platform_id: string | null;
  last_metrics_sync_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post_publish_metrics: any | null;
  created_at: string;
  updated_at: string;
}

export interface NewContentItem {
  live_session_id?: string | null;
  platform: ContentPlatform;
  title: string;
  description?: string | null;
  hashtags?: string[];
  status?: ContentStatus;
  priority?: ContentPriority;
  recommended_publish_at?: string | null;
  notes?: string | null;
  source_idea_id?: string | null;
  format?: string | null;
  duration?: string | null;
  reason?: string | null;
  source_platform?: SourcePlatform | null;
  source_video_url?: string | null;
  source_start_time?: number | null;
  source_end_time?: number | null;
  // V3.5
  title_variants?: Array<{ style: string; label: string; value: string }>;
  selected_title_variant?: string | null;
  description_variants?: Array<{ style: string; label: string; value: string }>;
  selected_description_variant?: string | null;
  hashtag_variants?: Array<{ style: string; label: string; tags: string[] }>;
  selected_hashtags?: string[];
  opportunity_score?: number | null;
  opportunity_label?: string | null;
  opportunity_reason?: string | null;
}

export function useContentItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_content_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setItems((data as ContentItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createMany = useCallback(async (rows: NewContentItem[]): Promise<number> => {
    if (!user || rows.length === 0) return 0;
    const payload = rows.map(r => ({
      user_id: user.id,
      live_session_id: r.live_session_id ?? null,
      platform: r.platform,
      title: r.title,
      description: r.description ?? null,
      hashtags: r.hashtags ?? [],
      status: r.status ?? "idea",
      priority: r.priority ?? "medium",
      recommended_publish_at: r.recommended_publish_at ?? null,
      notes: r.notes ?? null,
      source_idea_id: r.source_idea_id ?? null,
      format: r.format ?? null,
      duration: r.duration ?? null,
      reason: r.reason ?? null,
      source_platform: r.source_platform ?? null,
      source_video_url: r.source_video_url ?? null,
      source_start_time: r.source_start_time ?? null,
      source_end_time: r.source_end_time ?? null,
      title_variants: r.title_variants ?? [],
      selected_title_variant: r.selected_title_variant ?? null,
      description_variants: r.description_variants ?? [],
      selected_description_variant: r.selected_description_variant ?? null,
      hashtag_variants: r.hashtag_variants ?? [],
      selected_hashtags: r.selected_hashtags ?? [],
      opportunity_score: r.opportunity_score ?? null,
      opportunity_label: r.opportunity_label ?? null,
      opportunity_reason: r.opportunity_reason ?? null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_content_items")
      .insert(payload).select();
    if (err) throw new Error(err.message);
    await fetchAll();
    return (data?.length as number) ?? 0;
  }, [user, fetchAll]);

  const updateItem = useCallback(async (id: string, patch: Partial<ContentItem>) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("creator_content_items")
      .update(patch).eq("id", id).eq("user_id", user.id);
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [user, fetchAll]);

  const deleteItem = useCallback(async (id: string) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("creator_content_items")
      .delete().eq("id", id).eq("user_id", user.id);
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [user, fetchAll]);

  return { items, loading, error, refetch: fetchAll, createMany, updateItem, deleteItem };
}

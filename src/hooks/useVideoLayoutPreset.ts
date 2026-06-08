// Format Réseaux — preset caméra (facecam) du créateur.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LayoutRect { x: number; y: number; w: number; h: number; }

export type LayoutType = "facecam_top_gameplay_bottom" | "gameplay_only";

export interface VideoLayoutPreset {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  layout_type: LayoutType;
  facecam_x: number | null;
  facecam_y: number | null;
  facecam_width: number | null;
  facecam_height: number | null;
  gameplay_x: number | null;
  gameplay_y: number | null;
  gameplay_width: number | null;
  gameplay_height: number | null;
  source_reference_width: number | null;
  source_reference_height: number | null;
  output_width: number;
  output_height: number;
}

export function presetHasValidFacecam(preset: VideoLayoutPreset | null | undefined): boolean {
  if (!preset) return false;
  if (preset.layout_type === "gameplay_only") return true;
  return [preset.facecam_x, preset.facecam_y, preset.facecam_width, preset.facecam_height]
    .every((v) => typeof v === "number" && Number.isFinite(v) && (v as number) >= 0);
}

export function useVideoLayoutPreset(platform = "twitch", platformUserId: string | null | undefined) {
  const { user } = useAuth();
  const [preset, setPreset] = useState<VideoLayoutPreset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreset = useCallback(async () => {
    if (!user || !platformUserId) { setPreset(null); return; }
    setLoading(true); setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_video_layout_presets")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .eq("platform_user_id", platformUserId)
      .maybeSingle();
    if (err) setError(err.message);
    setPreset((data as VideoLayoutPreset | null) ?? null);
    setLoading(false);
  }, [user, platform, platformUserId]);

  useEffect(() => { fetchPreset(); }, [fetchPreset]);

  const savePreset = useCallback(async (input: {
    layout_type: LayoutType;
    facecam?: LayoutRect;
    gameplay?: LayoutRect | null;
    source_reference_width: number;
    source_reference_height: number;
  }) => {
    if (!user || !platformUserId) throw new Error("missing_context");
    const { data, error: err } = await supabase.functions.invoke("video-layout-preset-upsert", {
      body: {
        platform,
        platform_user_id: platformUserId,
        layout_type: input.layout_type,
        facecam: input.facecam,
        gameplay: input.gameplay ?? null,
        source_reference_width: input.source_reference_width,
        source_reference_height: input.source_reference_height,
      },
    });
    if (err) throw new Error(err.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = (data as any)?.preset as VideoLayoutPreset | undefined;
    if (saved) setPreset(saved);
    return saved;
  }, [user, platform, platformUserId]);

  return { preset, loading, error, refetch: fetchPreset, savePreset };
}

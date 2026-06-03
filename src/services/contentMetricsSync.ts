// V3.7 — Post-publication metrics sync.
// Calls the `youtube-fetch-public-stats` edge function and returns typed result.

import { supabase } from "@/integrations/supabase/client";

export interface ContentMetrics {
  source: "youtube";
  views: number | null;
  likes: number | null;
  comments: number | null;
  published_at: string | null;
  youtube_title: string | null;
  synced_at: string;
  raw?: Record<string, unknown>;
}

export type SyncReason =
  | "not_published"
  | "platform_unsupported"
  | "missing_video_id"
  | "youtube_not_connected"
  | "token_expired"
  | "quota_exceeded"
  | "video_not_found"
  | "forbidden"
  | "unauthorized"
  | "youtube_error"
  | "server_misconfigured"
  | "internal_error"
  | "unavailable";

export interface SyncResult {
  ok: boolean;
  reason?: SyncReason;
  metrics?: ContentMetrics;
}

export async function syncContentItemMetrics(args: {
  contentItemId: string;
  publishedPlatform: string | null | undefined;
  youtubeVideoId?: string | null;
  externalPlatformId?: string | null;
  publishedUrl?: string | null;
}): Promise<SyncResult> {
  const hasYoutubeSignal =
    !!args.youtubeVideoId ||
    args.publishedPlatform === "youtube" ||
    !!args.externalPlatformId ||
    /youtu\.?be/i.test(args.publishedUrl ?? "");

  if (!hasYoutubeSignal) {
    if (!args.publishedPlatform) return { ok: false, reason: "not_published" };
    return { ok: false, reason: "platform_unsupported" };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      success: boolean;
      reason?: SyncReason;
      metrics?: ContentMetrics;
    }>("youtube-fetch-public-stats", {
      body: { content_item_id: args.contentItemId },
    });
    if (error) return { ok: false, reason: "internal_error" };
    if (!data?.success) return { ok: false, reason: (data?.reason as SyncReason) ?? "unavailable" };
    return { ok: true, metrics: data.metrics };
  } catch {
    return { ok: false, reason: "internal_error" };
  }
}

// ── Performance label (real data only, no prediction) ──
export type PerformanceLabel =
  | "pending"
  | "low_traction"
  | "good_signal"
  | "strong_signal"
  | "repeat_worthy";

export function performanceLabelFromViews(views: number | null | undefined): {
  label: PerformanceLabel;
  text: string;
} {
  if (views == null) return { label: "pending", text: "En attente de données" };
  if (views < 100) return { label: "low_traction", text: "Faible traction" };
  if (views < 1000) return { label: "good_signal", text: "Bon signal" };
  if (views < 5000) return { label: "strong_signal", text: "Très bon signal" };
  return { label: "repeat_worthy", text: "À reproduire" };
}

export const PERFORMANCE_DISCLAIMER =
  "Cette lecture est basée sur les statistiques actuelles du contenu, pas sur une prédiction de performance.";

export function reasonToMessage(reason: SyncReason | undefined): string {
  switch (reason) {
    case "youtube_not_connected": return "YouTube n'est pas connecté.";
    case "token_expired":         return "Session YouTube expirée. Reconnecte YouTube.";
    case "quota_exceeded":        return "Quota YouTube atteint. Réessaie plus tard.";
    case "video_not_found":       return "Vidéo YouTube introuvable.";
    case "missing_video_id":      return "Aucun identifiant vidéo YouTube associé.";
    case "platform_unsupported":  return "Plateforme non supportée pour les analytics.";
    case "not_published":         return "Ce contenu n'est pas encore publié.";
    case "forbidden":             return "Accès refusé par YouTube.";
    case "server_misconfigured":  return "Service analytics indisponible.";
    case "unauthorized":          return "Authentification requise.";
    default:                      return "Métriques indisponibles pour le moment.";
  }
}

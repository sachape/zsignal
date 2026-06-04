/**
 * Maps internal ContentStatus / GenerationStatus combos to French labels
 * shown anywhere clip candidates surface (Content Queue, debrief, etc.).
 *
 * No raw English status must ever leak to the UI.
 */
import type { ContentItem } from "@/hooks/useContentItems";

export interface StatusBadge {
  label: string;
  tone: "default" | "muted" | "info" | "success" | "warning" | "destructive";
}

export function getContentStatusBadge(item: ContentItem): StatusBadge {
  // Generation lifecycle takes precedence when present.
  if (item.generation_status === "processing" || item.generation_status === "queued") {
    return { label: "Génération en cours", tone: "info" };
  }
  if (item.generation_status === "failed") {
    return { label: "Génération échouée", tone: "destructive" };
  }
  if (item.generation_status === "unavailable") {
    return { label: "VOD indisponible", tone: "warning" };
  }

  switch (item.status) {
    case "idea":
      return { label: "À préparer", tone: "muted" };
    case "to_produce":
      return { label: "À produire", tone: "muted" };
    case "to_generate":
      return { label: "Clip proposé", tone: "info" };
    case "generating":
      return { label: "Génération en cours", tone: "info" };
    case "draft_ready":
      return { label: "Clip généré", tone: "success" };
    case "ready":
      return { label: "Prêt à publier", tone: "success" };
    case "uploaded":
      return { label: "Téléversé", tone: "success" };
    case "published":
      return { label: "Publié", tone: "success" };
    case "published_manually":
      return { label: "Publié manuellement", tone: "success" };
    case "ignored":
      return { label: "Ignoré", tone: "muted" };
    default:
      return { label: "À préparer", tone: "muted" };
  }
}

export function getConfidenceLabel(score: number | null): string {
  if (score === null || score === undefined) return "Suggestion à vérifier";
  if (score >= 60) return "Fort signal";
  if (score >= 40) return "Signal modéré";
  return "Suggestion à vérifier";
}

export function formatVodTimestamp(seconds: number | null): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}`;
  return `${m}min${String(s).padStart(2, "0")}`;
}

/** Builds a Twitch deep link `?t=XhYmZs` if the source URL is a Twitch VOD. */
export function buildVodDeepLink(sourceUrl: string | null, startSeconds: number | null): string | null {
  if (!sourceUrl) return null;
  if (!/twitch\.tv\/videos\/\d+/.test(sourceUrl)) return sourceUrl;
  const sec = Math.max(0, Math.floor(startSeconds ?? 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const t = `${h}h${m}m${s}s`;
  const sep = sourceUrl.includes("?") ? "&" : "?";
  return `${sourceUrl}${sep}t=${t}`;
}

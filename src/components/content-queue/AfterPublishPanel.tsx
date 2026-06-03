// V3.7 — Post-publication YouTube analytics panel.
// Shows real metrics or honest "unavailable" states. Never invents 0.

import { useState } from "react";
import { BarChart3, ExternalLink, RefreshCcw, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ContentItem } from "@/hooks/useContentItems";
import {
  syncContentItemMetrics,
  performanceLabelFromViews,
  reasonToMessage,
  PERFORMANCE_DISCLAIMER,
  type ContentMetrics,
  type SyncReason,
} from "@/services/contentMetricsSync";

interface Props {
  item: ContentItem;
  onSynced: () => void;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export default function AfterPublishPanel({ item, onSynced }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<SyncReason | null>(null);

  const stored = (item.post_publish_metrics ?? null) as ContentMetrics | null;
  const hasStored = stored && stored.source === "youtube";
  const perf = performanceLabelFromViews(stored?.views ?? null);

  const canSync =
    !!item.youtube_video_id ||
    item.published_platform === "youtube" ||
    !!item.external_platform_id ||
    /youtu\.?be/i.test(item.published_url ?? "");

  async function handleRefresh() {
    setSyncing(true);
    setError(null);
    const res = await syncContentItemMetrics({
      contentItemId: item.id,
      publishedPlatform: item.published_platform,
      youtubeVideoId: item.youtube_video_id,
      externalPlatformId: item.external_platform_id,
      publishedUrl: item.published_url,
    });
    setSyncing(false);
    if (res.ok) {
      toast.success("Statistiques YouTube mises à jour");
      onSynced();
    } else {
      setError(res.reason ?? "unavailable");
      toast.error(reasonToMessage(res.reason));
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-emerald-300">
          <BarChart3 className="h-3.5 w-3.5" />
          Après publication
        </div>
        {canSync && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            disabled={syncing}
            onClick={handleRefresh}
          >
            {syncing
              ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              : <RefreshCcw className="mr-1 h-3 w-3" />}
            {syncing ? "Synchronisation…" : "Rafraîchir les stats"}
          </Button>
        )}
      </div>

      <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="font-medium text-foreground">Plateforme : </span>
          {item.published_platform === "youtube" || item.youtube_video_id ? "YouTube" : (item.published_platform ?? "—")}
        </div>
        {(item.published_url || item.youtube_url) && (
          <div className="truncate">
            <span className="font-medium text-foreground">URL : </span>
            <a
              href={item.published_url ?? item.youtube_url ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary hover:underline break-all"
            >
              voir la vidéo <ExternalLink className="inline h-3 w-3" />
            </a>
          </div>
        )}
        <div>
          <span className="font-medium text-foreground">Publié : </span>
          {formatDate(stored?.published_at ?? item.published_at)}
        </div>
        <div>
          <span className="font-medium text-foreground">Dernière sync : </span>
          {item.last_metrics_sync_at ? formatDate(item.last_metrics_sync_at) : "jamais"}
        </div>
      </div>

      {/* Metrics */}
      {hasStored ? (
        <>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Metric label="Vues" value={stored!.views} />
            <Metric label="Likes" value={stored!.likes} />
            <Metric label="Commentaires" value={stored!.comments} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              {perf.text}
            </span>
          </div>
          <div className="italic text-muted-foreground/80">{PERFORMANCE_DISCLAIMER}</div>
        </>
      ) : syncing ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Récupération des statistiques YouTube…
        </div>
      ) : (
        <div className="text-muted-foreground/90">
          {canSync
            ? "Les analytics ne sont pas encore synchronisées pour ce contenu."
            : "Analytics indisponibles : aucun identifiant YouTube associé."}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-300">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{reasonToMessage(error)}</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  const isMissing = value == null;
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${isMissing ? "text-muted-foreground/60" : "text-foreground"}`}>
        {isMissing ? "indisponible" : formatNumber(value)}
      </div>
    </div>
  );
}

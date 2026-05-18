import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Radio, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/StateView";
import { InlineLock } from "@/components/PaywallGate";
import { cn } from "@/lib/utils";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";
import {
  fetchCategoryStreamScoreLeaders,
  type StreamScoreLeaderChannel,
} from "@/services/leadersService";

interface Props {
  category: string;
  language: string;
  isPro: boolean;
}

const FREE_LIMIT = 3;
const LOW_INDEXED_THRESHOLD = 10;

const formatViewers = (n: number | null): string => {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const formatRelative = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - d) / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return `il y a ${j} j`;
};

const COPY_DEFAULT =
  "Classement Streamnco basé sur les chaînes déjà indexées dans cette catégorie. Les chaînes live sont enrichies en temps réel, mais le classement reste trié par StreamScore.";
const COPY_LOW =
  "Ce classement se remplit progressivement à mesure que Streamnco indexe de nouvelles chaînes.";
const COPY_EMPTY =
  "Aucune chaîne encore indexée pour cette catégorie. Le classement se remplira progressivement à mesure que Streamnco découvre et score de nouvelles chaînes.";

export const StreamScoreLeaderboard: React.FC<Props> = ({ category, language, isPro }) => {
  const [rows, setRows] = useState<StreamScoreLeaderChannel[]>([]);
  const [indexedCount, setIndexedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await fetchCategoryStreamScoreLeaders({ category, language, limit: 50 });
      if (cancelled) return;
      // Backend already orders by stream_score desc — do not re-sort by is_live.
      setRows(res.channels);
      setIndexedCount(res.indexedCount);
      const newest = res.channels.reduce<string | null>((acc, c) => {
        if (!c.updated_at) return acc;
        if (!acc || new Date(c.updated_at) > new Date(acc)) return c.updated_at;
        return acc;
      }, null);
      setLastUpdated(newest);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, language]);

  const helperCopy = useMemo(() => {
    if (rows.length === 0) return null;
    return indexedCount < LOW_INDEXED_THRESHOLD ? COPY_LOW : COPY_DEFAULT;
  }, [rows.length, indexedCount]);

  if (loading) return <LoadingState />;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 p-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 text-foreground">
            <Trophy className="h-4 w-4" />
            Aucune chaîne indexée pour le moment
          </p>
          <p className="pl-6 text-xs leading-relaxed">{COPY_EMPTY}</p>
        </CardContent>
      </Card>
    );
  }

  const visibleRows = isPro ? rows : rows.slice(0, FREE_LIMIT);
  const lockedRows = isPro ? [] : rows.slice(FREE_LIMIT);

  const renderRow = (c: StreamScoreLeaderChannel) => {
    const tier = getTierTheme(getScoreTier(c.stream_score));
    const isPodium = c.rank <= 3;
    return (
      <Link
        key={`${c.login}-${c.rank}`}
        to={`/streamer/${c.login}`}
        className={cn(
          "group flex items-start gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-card/80 sm:items-center sm:gap-3",
          c.rank === 1 ? "border-primary/25 bg-primary/[0.03]" : "border-border bg-card",
        )}
      >
        <span
          className={cn(
            "w-7 shrink-0 text-right text-xs font-bold tabular-nums",
            c.rank === 1
              ? "text-primary"
              : isPodium
                ? "text-foreground/80"
                : "text-muted-foreground",
          )}
        >
          #{c.rank}
        </span>
        <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border/60">
          {c.profile_image_url && <AvatarImage src={c.profile_image_url} alt={c.login} />}
          <AvatarFallback className="rounded-full text-[10px]">
            {c.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{c.display_name}</p>
            {c.is_live && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                <Radio className="h-2 w-2" /> Live
              </span>
            )}
            {c.broadcaster_type === "partner" && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Partenaire
              </Badge>
            )}
            {c.broadcaster_type === "affiliate" && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Affilié
              </Badge>
            )}
            {c.language && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {c.language.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">@{c.login}</span>
          </div>

          {/* Mobile stats */}
          <div className="mt-2.5 flex items-center gap-2 sm:hidden">
            {c.is_live && (
              <>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    viewers
                  </p>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatViewers(c.live_viewer_count)}
                    </span>
                  </div>
                </div>
                <div className="h-7 w-px bg-border/40" />
              </>
            )}
            <div
              className={cn(
                "flex min-w-[2.75rem] flex-col items-center justify-center rounded-lg border px-2 py-1.5",
                tier.surfaceClass,
              )}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
                StreamScore
              </span>
              <span className={cn("text-base font-bold tabular-nums leading-tight", tier.textClass)}>
                {c.stream_score}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop stats */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex sm:gap-3">
          {c.is_live && (
            <>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  viewers
                </p>
                <div className="flex items-center justify-end gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatViewers(c.live_viewer_count)}
                  </span>
                </div>
              </div>
              <div className="h-7 w-px bg-border/40" />
            </>
          )}
          <div
            className={cn(
              "flex min-w-[2.75rem] flex-col items-center justify-center rounded-lg border px-2 py-1.5",
              tier.surfaceClass,
            )}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
              StreamScore
            </span>
            <span className={cn("text-base font-bold tabular-nums leading-tight", tier.textClass)}>
              {c.stream_score}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="grid gap-3">
      {helperCopy && (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {helperCopy}
        </p>
      )}

      <div className="grid gap-2">
        {visibleRows.map(renderRow)}
        {lockedRows.length > 0 && (
          <div className="mt-2">
            <InlineLock
              feature={`${lockedRows.length} chaîne${lockedRows.length > 1 ? "s" : ""} supplémentaire${lockedRows.length > 1 ? "s" : ""} — Pro`}
              description="Accède à l'intégralité du classement indexé."
              blurHeight="200px"
            >
              <div className="grid gap-2">{lockedRows.map(renderRow)}</div>
            </InlineLock>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {indexedCount} chaîne{indexedCount > 1 ? "s" : ""} indexée{indexedCount > 1 ? "s" : ""} ·
        Classement non exhaustif · Source : Streamnco (channel_stream_scores)
      </p>
    </div>
  );
};

export default StreamScoreLeaderboard;

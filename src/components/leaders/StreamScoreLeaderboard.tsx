import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Lock, Radio, Sparkles, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/StateView";
import { cn } from "@/lib/utils";
import { analytics } from "@/services/analytics";
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

const PAGE_SIZE = 50;
const LOW_INDEXED_THRESHOLD = 10;

const formatViewers = (n: number | null): string => {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
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
  const [lockedCount, setLockedCount] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial / category-change load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows([]);
    (async () => {
      const res = await fetchCategoryStreamScoreLeaders({
        category,
        language,
        limit: isPro ? PAGE_SIZE : 3,
        offset: 0,
      });
      if (cancelled) return;
      setRows(res.channels);
      setIndexedCount(res.indexedCount);
      setLockedCount(res.lockedCount);
      setNextOffset(res.nextOffset);
      setHasMore(res.hasMore);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, language, isPro]);

  const loadMore = useCallback(async () => {
    if (!hasMore || nextOffset == null || loadingMore) return;
    setLoadingMore(true);
    const res = await fetchCategoryStreamScoreLeaders({
      category,
      language,
      limit: PAGE_SIZE,
      offset: nextOffset,
    });
    setRows((prev) => [...prev, ...res.channels]);
    setIndexedCount(res.indexedCount);
    setLockedCount(res.lockedCount);
    setNextOffset(res.nextOffset);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  }, [category, language, hasMore, nextOffset, loadingMore]);

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

  const visibleCount = rows.length;
  const showFreePaywall = !isPro && lockedCount > 0;

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

  const footerText = isPro
    ? `${visibleCount} chaîne${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""} sur ${indexedCount} chaîne${indexedCount > 1 ? "s" : ""} indexée${indexedCount > 1 ? "s" : ""}`
    : `${visibleCount} chaîne${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""} sur ${indexedCount} chaîne${indexedCount > 1 ? "s" : ""} indexée${indexedCount > 1 ? "s" : ""}${lockedCount > 0 ? ` · ${lockedCount} verrouillée${lockedCount > 1 ? "s" : ""}` : ""}`;

  return (
    <div className="grid gap-3">
      {helperCopy && (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {helperCopy}
        </p>
      )}

      <div className="grid gap-2">{rows.map(renderRow)}</div>

      {showFreePaywall && (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-card/60 px-5 py-5 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Classement complet réservé au Pro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tu vois les {visibleCount} premières chaînes. Passe Pro pour débloquer
              {" "}les {lockedCount} autres chaînes indexées dans cette catégorie.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground/80">
              {visibleCount} visible{visibleCount > 1 ? "s" : ""} · {lockedCount} verrouillée{lockedCount > 1 ? "s" : ""}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <Link
              to="/billing"
              onClick={() => analytics.upgradeClicked("streamscore_leaderboard", "inline")}
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              Débloquer le classement complet
            </Link>
          </Button>
        </div>
      )}

      {isPro && hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Chargement…" : "Charger plus"}
          </Button>
        </div>
      )}

      {isPro && !hasMore && rows.length > 0 && indexedCount > PAGE_SIZE && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground/80">
          Tous les résultats sont affichés
        </p>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {footerText} · Classement non exhaustif · Source : Streamnco
      </p>
    </div>
  );
};

export default StreamScoreLeaderboard;

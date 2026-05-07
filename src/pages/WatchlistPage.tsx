import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkX, Trophy, ArrowRight, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWatchlist,
  removeFromWatchlist,
  patchWatchlistEntry,
  type WatchlistEntry,
} from "@/services/benchmarkWatchlist";
import { PublicChannelLookupService } from "@/services/publicChannelLookup";
import { getSnapshots, viewersTrend } from "@/services/competitorSnapshots";
import { SparkLine } from "@/components/CompetitorTrendChart";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Il y a 1 sem.";
  if (weeks < 5) return `Il y a ${weeks} sem.`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

const Avatar = ({ entry }: { entry: WatchlistEntry }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (entry.avatar_url && !imgFailed) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-border/40"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-2 ring-border/40 text-sm font-bold text-foreground">
      {entry.display_name[0]?.toUpperCase() ?? "?"}
    </div>
  );
};

const WatchlistPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setEntries(getWatchlist(user?.id ?? null));
    const sync = () => setEntries(getWatchlist(user?.id ?? null));
    window.addEventListener("streampulse:watchlist-changed", sync);
    return () => window.removeEventListener("streampulse:watchlist-changed", sync);
  }, [user?.id]);

  // Backfill missing avatars for entries bookmarked before avatar storage was added
  useEffect(() => {
    const missing = entries.filter((e) => !e.avatar_url);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const entry of missing) {
        if (cancelled) break;
        try {
          const result = await PublicChannelLookupService.findByInput(entry.login);
          const avatar = result?.data?.profile?.profile_image_url;
          if (avatar && !cancelled) {
            patchWatchlistEntry(user?.id ?? null, entry.login, { avatar_url: avatar });
          }
        } catch {
          // best-effort
        }
      }
    })();
    return () => { cancelled = true; };
  }, [entries, user?.id]);

  const remove = (login: string) => {
    removeFromWatchlist(user?.id ?? null, login);
  };

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Benchmark
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Watchlist
            </h1>
            {entries.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {entries.length} profil{entries.length > 1 ? "s" : ""} suivi{entries.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {entries.length > 0 && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/leaders">
                <Trophy className="h-3.5 w-3.5" />
                Explorer les classements
              </Link>
            </Button>
          )}
        </div>

        {/* Empty state */}
        {entries.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            {/* Subtle gradient top accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="flex flex-col items-center gap-6 px-8 py-16 text-center">
              {/* Icon with glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.06]">
                  <Bookmark className="h-7 w-7 text-primary" />
                </div>
              </div>

              <div className="max-w-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Aucun streamer dans ta watchlist
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Explore les classements, ouvre un profil qui t'intéresse, et clique sur l'icône{" "}
                  <Bookmark className="inline h-3.5 w-3.5 align-middle" /> pour le suivre ici.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Button asChild size="sm">
                  <Link to="/leaders">
                    <Trophy className="h-3.5 w-3.5" />
                    Explorer les classements
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
                  <Link to="/competitors">Voir les concurrents</Link>
                </Button>
              </div>

              {/* Feature hints */}
              <div className="mt-2 grid gap-2 text-left sm:grid-cols-3">
                {[
                  { icon: "📊", title: "Compare", desc: "Mesure les écarts entre ce profil et le tien" },
                  { icon: "🔍", title: "Observe", desc: "Repère les mécaniques à copier cette semaine" },
                  { icon: "📌", title: "Garde", desc: "Retrouve tes références en un clic" },
                ].map((h) => (
                  <div
                    key={h.title}
                    className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3"
                  >
                    <span className="text-base">{h.icon}</span>
                    <p className="mt-1 text-xs font-semibold text-foreground">{h.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Filled list */
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            {entries.map((entry) => {
              const snaps = getSnapshots(user?.id ?? null, entry.login);
              const { direction, pct } = viewersTrend(snaps);
              const hasTrend = snaps.length >= 2;
              const TrendIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
              const trendColor = direction === "up" ? "text-success" : direction === "down" ? "text-destructive" : "text-muted-foreground";

              return (
                <div
                  key={entry.login}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20"
                >
                  {/* Avatar */}
                  <Avatar entry={entry} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.display_name}
                      </span>
                      {entry.category && (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full px-2 text-[10px] font-medium"
                        >
                          {entry.category}
                        </Badge>
                      )}
                      {hasTrend && direction !== "unknown" && (
                        <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold tabular-nums", trendColor)}>
                          <TrendIcon className="h-3 w-3" />
                          {pct !== null ? `${pct > 0 ? "+" : ""}${pct}%` : ""}
                        </span>
                      )}
                      {snaps.length === 1 && (
                        <span className="text-[10px] text-muted-foreground">1er snapshot</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      @{entry.login} · {timeAgo(entry.added_at)}
                      {snaps.length > 0 && ` · ${snaps.length} snapshot${snaps.length > 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Sparkline */}
                  {hasTrend && (
                    <SparkLine snapshots={snaps} />
                  )}

                  {/* Actions */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    title="Retirer de la watchlist"
                    onClick={() => remove(entry.login)}
                  >
                    <BookmarkX className="h-4 w-4" />
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 text-xs">
                    <Link to={`/streamer/${entry.login}`}>
                      Voir le profil
                      <ArrowRight className="h-3 w-3 opacity-50" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {entries.length > 0 && (
          <p className="mt-4 text-[11px] text-muted-foreground/50">
            Stocké localement sur cet appareil · non synchronisé entre appareils
          </p>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default WatchlistPage;

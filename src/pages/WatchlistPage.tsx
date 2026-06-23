import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkX, Trophy, ArrowRight, ChevronRight, TrendingUp, TrendingDown, Minus, Bell, X, Zap, Star } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { LimitBanner, InlineLock } from "@/components/PaywallGate";
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
import {
  computeAlerts,
  dismissAlerts,
  areAlertsDismissed,
  type CompetitorAlert,
  type AlertType,
} from "@/services/competitorAlerts";
import { SparkLine } from "@/components/CompetitorTrendChart";
import { cn } from "@/lib/utils";

const ALERT_META: Record<AlertType, { label: (a: CompetitorAlert) => string; color: string; icon: React.ElementType }> = {
  viewers_surge: {
    label: (a) => `+${a.pct}% viewers`,
    color: "text-success",
    icon: TrendingUp,
  },
  viewers_drop: {
    label: (a) => `-${a.pct}% viewers`,
    color: "text-destructive",
    icon: TrendingDown,
  },
  score_up: {
    label: (a) => `Score +${a.delta} pts`,
    color: "text-success",
    icon: Star,
  },
  score_down: {
    label: (a) => `Score -${Math.abs(a.delta)} pts`,
    color: "text-destructive",
    icon: TrendingDown,
  },
  clips_spike: {
    label: (a) => `+${a.delta} clips`,
    color: "text-primary-strong",
    icon: Zap,
  },
};

const AlertAvatar = ({ alert }: { alert: CompetitorAlert }) => {
  const [imgFailed, setImgFailed] = useState(false);
  if (alert.avatar_url && !imgFailed) {
    return (
      <img
        src={alert.avatar_url}
        alt={alert.display_name}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-border/40"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-1 ring-border/40 text-xs font-bold text-foreground">
      {alert.display_name[0]?.toUpperCase() ?? "?"}
    </div>
  );
};

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

const FREE_WATCHLIST_LIMIT = 3;

const WatchlistPage = () => {
  const { user } = useAuth();
  const { isPro } = usePlan();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  useEffect(() => {
    const uid = user?.id ?? null;
    let cancelled = false;
    (async () => {
      const { loadWatchlistFromDb } = await import("@/services/benchmarkWatchlist");
      const list = await loadWatchlistFromDb(uid);
      if (cancelled) return;
      setEntries(list);
      // Hydrate snapshots for all entries so trends render
      const { loadSnapshotsFromDb } = await import("@/services/competitorSnapshots");
      await Promise.all(list.map((e) => loadSnapshotsFromDb(uid, e.login)));
      if (cancelled) return;
      setAlerts(computeAlerts(uid, list));
      setAlertsDismissed(areAlertsDismissed(uid));
    })();

    const sync = () => {
      const updated = getWatchlist(uid);
      setEntries(updated);
      setAlerts(computeAlerts(uid, updated));
    };
    const onDismiss = () => setAlertsDismissed(true);
    window.addEventListener("streampulse:watchlist-changed", sync);
    window.addEventListener("streampulse:alerts-dismissed", onDismiss);
    return () => {
      cancelled = true;
      window.removeEventListener("streampulse:watchlist-changed", sync);
      window.removeEventListener("streampulse:alerts-dismissed", onDismiss);
    };
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

  const handleDismissAlerts = () => {
    dismissAlerts(user?.id ?? null);
  };

  const showAlerts = alerts.length > 0 && !alertsDismissed && entries.length > 0;

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
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
              <Link to="/classements">
                <Trophy className="h-3.5 w-3.5" />
                Explorer les classements
              </Link>
            </Button>
          )}
        </div>

        {/* Alerts digest */}
        {showAlerts && (
          <div className="mb-6 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.04]">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary-strong" />
                <span className="text-xs font-semibold text-foreground">
                  Cette semaine dans ta watchlist
                </span>
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary-strong tabular-nums">
                  {alerts.length}
                </span>
              </div>
              <button
                onClick={handleDismissAlerts}
                className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                title="Masquer pour 7 jours"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-border/40 border-t border-border/40">
              {alerts.map((alert) => {
                const meta = ALERT_META[alert.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={alert.login}
                    to={`/streamer/${alert.login}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20"
                  >
                    <AlertAvatar alert={alert} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-foreground">
                        {alert.display_name}
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1 text-xs font-semibold tabular-nums", meta.color)}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {meta.label(alert)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
                  <Bookmark className="h-7 w-7 text-primary-strong" />
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
                  <Link to="/classements">
                    <Trophy className="h-3.5 w-3.5" />
                    Explorer les classements
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
                  <Link to="/competitors">Voir les concurrents</Link>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground/50">
                Stockée sur cet appareil · non synchronisée entre appareils
              </p>

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
          <>
            {!isPro && entries.length >= FREE_WATCHLIST_LIMIT && (
              <div className="mb-4">
                <LimitBanner current={entries.length} max={FREE_WATCHLIST_LIMIT} label="streamer" />
              </div>
            )}
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            {(isPro ? entries : entries.slice(0, FREE_WATCHLIST_LIMIT)).map((entry) => {
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
          {!isPro && entries.length > FREE_WATCHLIST_LIMIT && (
            <div className="mt-3">
              <InlineLock
                feature={`${entries.length - FREE_WATCHLIST_LIMIT} profil${entries.length - FREE_WATCHLIST_LIMIT > 1 ? "s" : ""} masqué${entries.length - FREE_WATCHLIST_LIMIT > 1 ? "s" : ""} — Pro`}
                description="Passe au Pro pour suivre un nombre illimité de streamers."
                blurHeight="80px"
              >
                <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/40 overflow-hidden opacity-50">
                  {entries.slice(FREE_WATCHLIST_LIMIT).map((e) => (
                    <div key={e.login} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{e.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{e.login}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </InlineLock>
            </div>
          )}
          </>
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

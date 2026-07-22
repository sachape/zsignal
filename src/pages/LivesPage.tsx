import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Radio } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatLiveDateTime,
  formatLiveDuration,
  formatRelativeFrom,
  getDebriefsBySessionIds,
  listLiveSessions,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "oldest" | "duration" | "score";

type Row = { session: LiveSession; debrief: LiveDebrief | null };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Récent" },
  { key: "oldest", label: "Ancien" },
  { key: "duration", label: "Durée" },
  { key: "score", label: "Score" },
];

const StatusBadge = ({ session, debrief }: Row) => {
  if (session.status === "live") {
    return (
      <Badge variant="destructive" className="h-5 px-1.5 text-[12px]">
        Live en cours
      </Badge>
    );
  }
  if (debrief?.has_enough_signal) {
    return (
      <Badge variant="muted" className="h-5 px-1.5 text-[12px]">
        Débrief disponible
      </Badge>
    );
  }
  if (debrief === null) {
    return (
      <Badge
        variant="outline"
        className="h-5 border-warning/40 px-1.5 text-[12px] text-warning/80"
      >
        Pas encore analysé
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-5 px-1.5 text-[12px]">
      Signal limité
    </Badge>
  );
};

const LiveRow = ({
  session,
  debrief,
  avgScore,
}: Row & { avgScore: number | null }) => {
  const score = debrief?.overall_score ?? null;
  const delta =
    score !== null && avgScore !== null ? score - avgScore : null;
  const isLive = session.status === "live";

  return (
    <Link
      to={isLive ? "/lives/last" : `/lives/${session.id}`}
      className="group block"
    >
      <Card className="border-border/60 transition-colors hover:border-border hover:bg-card/80">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              isLive ? "bg-destructive/15" : "bg-muted"
            }`}
          >
            {isLive ? (
              <Radio className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {formatLiveDateTime(session.started_at)}
              </p>
              <StatusBadge session={session} debrief={debrief} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatLiveDuration(session.duration_minutes)}
              {session.category_name ? ` · ${session.category_name}` : ""}
              {!isLive
                ? ` · ${formatRelativeFrom(session.ended_at ?? session.started_at)}`
                : ""}
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Score
            </p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {score ?? "—"}
            </p>
            {delta !== null && Math.abs(delta) >= 3 && (
              <p
                className={cn(
                  "text-[12px] font-semibold tabular-nums",
                  delta > 0 ? "text-primary-strong" : "text-destructive",
                )}
              >
                {delta > 0 ? `+${delta}` : delta} vs moy.
              </p>
            )}
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
};

const LivesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [debriefs, setDebriefs] = useState<Map<string, LiveDebrief>>(
    new Map(),
  );
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listLiveSessions(user.id, 50);
      if (cancelled) return;
      const map = await getDebriefsBySessionIds(list.map((s) => s.id));
      if (cancelled) return;
      setSessions(list);
      setDebriefs(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const rows = useMemo<Row[]>(
    () =>
      sessions.map((s) => ({ session: s, debrief: debriefs.get(s.id) ?? null })),
    [sessions, debriefs],
  );

  const avgScore = useMemo(() => {
    const scored = rows.filter((r) => r.debrief?.overall_score != null);
    if (scored.length === 0) return null;
    return Math.round(
      scored.reduce((s, r) => s + r.debrief!.overall_score!, 0) /
        scored.length,
    );
  }, [rows]);

  const sortedRows = useMemo<Row[]>(() => {
    return [...rows].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.session.started_at).getTime() -
            new Date(b.session.started_at).getTime()
          );
        case "duration":
          return (
            (b.session.duration_minutes ?? 0) -
            (a.session.duration_minutes ?? 0)
          );
        case "score":
          return (
            (b.debrief?.overall_score ?? -1) -
            (a.debrief?.overall_score ?? -1)
          );
        default:
          return (
            new Date(b.session.started_at).getTime() -
            new Date(a.session.started_at).getTime()
          );
      }
    });
  }, [rows, sort]);

  const hasAnyDebrief = rows.some((r) => r.debrief?.has_enough_signal);

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          eyebrow="Lives"
          title="Historique des lives"
          description="Retrouve tes dernières sessions et ouvre leur débrief en un clic."
        />

        {loading ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Radio className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Aucun live détecté pour le moment.
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Dès que tu lances un stream, Streamnco créera automatiquement
                une session et un débrief.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {!hasAnyDebrief && (
              <Card className="mb-4 border-border/60 bg-card/60">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Tes premières sessions arrivent.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dès qu'il y aura assez de signal, tes débriefs complets
                    apparaîtront ici.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sort control */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {rows.length} session{rows.length > 1 ? "s" : ""}
                {avgScore !== null && ` · Score moyen ${avgScore}`}
              </p>
              <div className="inline-flex gap-0.5 rounded-lg border border-border/60 bg-card/50 p-0.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                      sort === opt.key
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {sortedRows.map((r) => (
                <LiveRow key={r.session.id} {...r} avgScore={avgScore} />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
};

import { ProFeaturePreview } from "@/components/ProFeatureGate";
import { usePlan } from "@/hooks/usePlan";

const LivesPageGated = () => {
  const { isPro, loading } = usePlan();
  if (loading) {
    return <AppShell><PageContainer><LoadingState /></PageContainer></AppShell>;
  }
  if (!isPro) {
    return (
      <AppShell>
        <ProFeaturePreview
          featureName="lives_history"
          title="Historique avancé disponible avec Pro"
          description="Analyse l’évolution de tes lives, de ton score et de tes performances dans le temps."
          benefits={[
            "Évolution de tes lives",
            "Historique de ton StreamScore",
            "Tendances de performance",
          ]}
        />
      </AppShell>
    );
  }
  return <LivesPage />;
};

export default LivesPageGated;

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

type Row = { session: LiveSession; debrief: LiveDebrief | null };

const StatusBadge = ({ session, debrief }: Row) => {
  if (session.status === "live") {
    return (
      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
        Live en cours
      </Badge>
    );
  }
  if (debrief?.has_enough_signal) {
    return (
      <Badge variant="muted" className="h-5 px-1.5 text-[10px]">
        Débrief disponible
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
      Signal limité
    </Badge>
  );
};

const LiveRow = ({ session, debrief }: Row) => {
  const score = debrief?.overall_score ?? null;
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
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Score
            </p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {score ?? "—"}
            </p>
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
  const [debriefs, setDebriefs] = useState<Map<string, LiveDebrief>>(new Map());

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
    () => sessions.map((s) => ({ session: s, debrief: debriefs.get(s.id) ?? null })),
    [sessions, debriefs],
  );

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
                Dès que tu lances un stream, StreamPulse créera automatiquement
                une session et un débrief.
              </p>
            </CardContent>
          </Card>
        ) : !hasAnyDebrief ? (
          <>
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
            <div className="space-y-2">
              {rows.map((r) => (
                <LiveRow key={r.session.id} {...r} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <LiveRow key={r.session.id} {...r} />
            ))}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default LivesPage;

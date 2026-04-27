import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Radio, TrendingDown, TrendingUp, Minus } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatLiveDateTime,
  formatLiveDuration,
  getLiveSessionById,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";

const SubScore = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3">
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
      {value ?? "—"}
      {value !== null && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">/100</span>
      )}
    </p>
  </div>
);

const DeltaPill = ({
  label,
  delta,
  unit,
  positiveIsGood = true,
}: {
  label: string;
  delta: number | undefined;
  unit: string;
  positiveIsGood?: boolean;
}) => {
  if (typeof delta !== "number") return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone =
    delta === 0
      ? "text-muted-foreground"
      : (delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood)
        ? "text-success"
        : "text-warning";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        <p className={`text-sm font-semibold tabular-nums ${tone}`}>
          {sign}
          {delta} {unit}
        </p>
      </div>
    </div>
  );
};

const LiveDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [debrief, setDebrief] = useState<LiveDebrief | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { session: s, debrief: d } = await getLiveSessionById(id);
      if (cancelled) return;
      setSession(s);
      setDebrief(d);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Lives"
            title="Live introuvable"
            description="Cette session n'existe pas ou n'est pas associée à ton compte."
          />
          <Button asChild variant="outline" size="sm">
            <Link to="/lives">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à l'historique
            </Link>
          </Button>
        </PageContainer>
      </AppShell>
    );
  }

  // Live in progress
  if (session.status === "live") {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Live en cours"
            title={`Session démarrée ${formatLiveDateTime(session.started_at)}`}
            description="Le débrief sera disponible dès la fin du stream."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/lives" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Historique
                </Link>
              </Button>
            }
          />
          <Card className="border-destructive/40 bg-destructive/[0.04]">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-destructive/15">
                <Radio className="h-5 w-5 text-destructive" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Session live en cours d'enregistrement
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.category_name ?? "Catégorie inconnue"}
                </p>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  const score = debrief?.overall_score ?? null;
  const enough = debrief?.has_enough_signal ?? false;
  const cmp = debrief?.comparison_data ?? null;

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          eyebrow="Débrief du live"
          title={`Débrief du ${formatLiveDateTime(session.started_at)}`}
          description={`${formatLiveDuration(session.duration_minutes)}${
            session.category_name ? ` · ${session.category_name}` : ""
          }`}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/lives" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                Historique
              </Link>
            </Button>
          }
        />

        <Card className="mb-4">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-2xl font-semibold text-primary tabular-nums">
                  {score ?? "—"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Score du live
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {debrief?.verdict ?? "Pas encore assez de signal sur ce live."}
                </p>
              </div>
            </div>
            {!enough && (
              <Badge variant="muted" className="self-start sm:self-auto">
                Signal limité
              </Badge>
            )}
          </CardContent>
        </Card>

        {enough ? (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SubScore label="Démarrage" value={debrief?.score_start ?? null} />
            <SubScore label="Tenue" value={debrief?.score_hold ?? null} />
            <SubScore label="Structure" value={debrief?.score_structure ?? null} />
          </div>
        ) : (
          <Card className="mb-4 border-border/60 bg-card/60">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground">
                Pas encore assez de signal pour un débrief complet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ce live était trop court ou trop peu documenté pour produire une lecture fiable.
              </p>
            </CardContent>
          </Card>
        )}

        {(debrief?.strength || debrief?.weakness || debrief?.priority_action) && (
          <div className="mb-4 space-y-3">
            {debrief?.strength && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-success">
                    Ton point fort sur ce live
                  </p>
                  <p className="mt-1 text-sm text-foreground">{debrief.strength}</p>
                </CardContent>
              </Card>
            )}
            {debrief?.weakness && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-warning">
                    Ton principal point faible
                  </p>
                  <p className="mt-1 text-sm text-foreground">{debrief.weakness}</p>
                </CardContent>
              </Card>
            )}
            {debrief?.priority_action && (
              <Card className="border-primary/30 bg-primary/[0.04]">
                <CardContent className="p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                    Action prioritaire pour le prochain stream
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {debrief.priority_action}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {cmp?.has_previous && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Comparaison avec le live précédent
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <DeltaPill label="Durée" delta={cmp.duration_delta_min} unit="min" />
                <DeltaPill label="Pic viewers" delta={cmp.peak_delta} unit="" />
                <DeltaPill label="Viewers moyens" delta={cmp.avg_delta} unit="" />
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default LiveDetailPage;
